import { prisma } from '../../db/prisma';
import { redis, RKEY } from '../../db/redis';
import { pickRandomTruth, pickRandomDare } from '@spinthe/shared';
import { addHearts } from '../users/users.service';

export const SPIN_DURATION_MS = 3500;
export const CHOICE_DURATION_MS = 15_000; // 15 сек на выбор "целовать/отказать"
export const CARD_DURATION_MS = 45_000;   // 45 сек на правду/действие

export type GamePhase =
  | 'awaiting_spin'
  | 'spinning'
  | 'choosing' // спиннер решает целовать/отказать
  | 'truth_dare'
  | 'finished';

export interface GameState {
  gameId: string;
  tableId: number;
  phase: GamePhase;
  currentStep: number;
  totalSteps: number;
  spinnerId: number;
  targetId: number | null;
  spinStartAt: number | null;
  spinEndAt: number | null;
  rotationDeg: number | null;
  /** Последняя выбранная карточка */
  card: { type: 'truth' | 'dare'; text: string } | null;
  cardDeadline: number | null;
  /** Был ли выбор (поцелуй/отказ) */
  choice: 'kiss' | 'reject' | null;
}

/**
 * Кэш состояния активной игры в Redis, чтобы не долбить БД на каждое событие.
 * Персист в таблицу Spin/Game идёт по окончании раунда.
 */

export async function getGameState(tableId: number): Promise<GameState | null> {
  const raw = await redis.get(RKEY.tableGame(tableId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

async function saveGameState(state: GameState): Promise<void> {
  await redis.set(
    RKEY.tableGame(state.tableId),
    JSON.stringify(state),
    'EX',
    60 * 60,
  );
}

export async function deleteGameState(tableId: number): Promise<void> {
  await redis.del(RKEY.tableGame(tableId));
}

/** Инициализировать новую игру после room:start (первое вращение пока не начато). */
export async function initGame(gameId: string, tableId: number, hostId: number, totalSteps: number): Promise<GameState> {
  const state: GameState = {
    gameId,
    tableId,
    phase: 'awaiting_spin',
    currentStep: 0,
    totalSteps,
    spinnerId: hostId,
    targetId: null,
    spinStartAt: null,
    spinEndAt: null,
    rotationDeg: null,
    card: null,
    cardDeadline: null,
    choice: null,
  };
  await saveGameState(state);
  return state;
}

/** Выбрать случайную цель, исключая спиннера и оффлайн игроков. */
export async function pickRandomTarget(tableId: number, spinnerId: number): Promise<number | null> {
  const players = await prisma.tablePlayer.findMany({
    where: { tableId, status: 'active' },
    select: { userId: true },
  });
  const candidates = players.filter((p: { userId: number }) => p.userId !== spinnerId).map((p: { userId: number }) => p.userId);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Сгенерировать финальный угол поворота так, чтобы горлышко указывало на цель. */
export function computeRotationForTarget(
  targetSlotIndex: number,
  totalSlots: number,
  spins: number = 5,
): number {
  // Горлышко изначально смотрит вверх (0°). Слот 0 — сверху, далее по часовой стрелке (360/totalSlots на каждый слот).
  const slotAngle = (targetSlotIndex / totalSlots) * 360;
  // Случайный разброс внутри слота ±(360/totalSlots/3)
  const jitter = (Math.random() - 0.5) * (360 / totalSlots) * 0.6;
  const finalAngle = spins * 360 + slotAngle + jitter;
  return finalAngle;
}

/** Начать вращение. Вызывается тем игроком, чей ход. */
export async function startSpin(
  tableId: number,
  spinnerId: number,
  slotByUser: Record<number, number>,
  totalSlots: number,
): Promise<{ state: GameState; targetId: number; rotationDeg: number; durationMs: number }> {
  const state = await getGameState(tableId);
  if (!state) throw new GameError('no_game', 'Нет активной игры');
  if (state.phase !== 'awaiting_spin') throw new GameError('bad_phase', 'Сейчас нельзя крутить');
  if (state.spinnerId !== spinnerId) throw new GameError('not_turn', 'Не твой ход');

  const targetId = await pickRandomTarget(tableId, spinnerId);
  if (targetId === null) throw new GameError('no_target', 'Нет цели');

  const targetSlot = slotByUser[targetId];
  const rotationDeg = computeRotationForTarget(targetSlot, totalSlots, 5 + Math.floor(Math.random() * 3));

  state.phase = 'spinning';
  state.targetId = targetId;
  state.spinStartAt = Date.now();
  state.spinEndAt = Date.now() + SPIN_DURATION_MS;
  state.rotationDeg = rotationDeg;
  state.choice = null;
  state.card = null;
  await saveGameState(state);

  // Таймер на окончание вращения → переход в фазу выбора
  setTimeout(async () => {
    try {
      const s = await getGameState(tableId);
      if (!s || s.gameId !== state.gameId) return;
      if (s.phase !== 'spinning') return;
      s.phase = 'choosing';
      s.spinStartAt = null;
      s.spinEndAt = null;
      await saveGameState(s);
    } catch (e) {
      console.error('[game] spin finish error', e);
    }
  }, SPIN_DURATION_MS);

  return { state, targetId, rotationDeg, durationMs: SPIN_DURATION_MS };
}

export type ChoiceResult =
  | { ended: true; card?: undefined; nextSpinnerId?: undefined; state?: undefined }
  | { ended?: false; state: GameState; card: { type: 'truth' | 'dare'; text: string } | null; nextSpinnerId: number | null };

/** Записать поцелуй/отказ и перейти к правде/действию или к следующему шагу. */
export async function submitChoice(
  tableId: number,
  spinnerId: number,
  choice: 'kiss' | 'reject',
): Promise<ChoiceResult> {
  const state = await getGameState(tableId);
  if (!state) throw new GameError('no_game', 'Нет активной игры');
  if (state.phase !== 'choosing') throw new GameError('bad_phase', 'Сейчас не выбирают');
  if (state.spinnerId !== spinnerId) throw new GameError('not_turn', 'Не твой ход');
  if (!state.targetId) throw new GameError('no_target', 'Нет цели');

  state.choice = choice;
  if (choice === 'reject') {
    // При отказе — сразу переходим к следующему спиннеру, поцелуев не начисляем
    await persistSpin(state, choice);
    const next = await advanceSpinner(state);
    if ('ended' in next) return { ended: true } as ChoiceResult;
    return { state: next.state, card: null, nextSpinnerId: next.nextSpinnerId } as ChoiceResult;
  }

  // kiss — начисляем поцелуи и переходим к карточке правда/действие
  await prisma.user.update({
    where: { id: state.targetId },
    data: { totalKisses: { increment: 1 } },
  });
  await addHearts(state.targetId, 2, 'kiss_received');
  await addHearts(spinnerId, 1, 'kiss_sent');

  state.phase = 'truth_dare';
  // Выбираем случайную карту (50/50 правда или действие)
  const card = Math.random() < 0.5 ? pickRandomTruth() : pickRandomDare();
  state.card = { type: card.id.startsWith('t') ? 'truth' : 'dare', text: card.text };
  state.cardDeadline = Date.now() + CARD_DURATION_MS;
  await saveGameState(state);

  await persistSpin(state, choice);

  return { state, card: state.card, nextSpinnerId: null } as ChoiceResult;
}

/** Вспомогательная функция для таймаутов: безопасно получить следующий шаг или конец. */
export async function safeAdvanceSpinner(state: GameState): Promise<
  { ended: true } | { state: GameState; nextSpinnerId: number }
> {
  return advanceSpinner(state);
}

/** Сохранить текущий Spin в БД. */
async function persistSpin(state: GameState, choice: 'kiss' | 'reject') {
  if (state.targetId === null || state.rotationDeg === null) return;
  await prisma.spin.create({
    data: {
      gameId: state.gameId,
      step: state.currentStep,
      spinnerId: state.spinnerId,
      targetId: state.targetId,
      choice,
      rotationDeg: state.rotationDeg,
    },
  });
}

/** Игрок нажал "готово" после карточки → перейти к следующему крутящему. */
export async function completeCard(tableId: number, completerId: number): Promise<{ state: GameState; nextSpinnerId: number } | { ended: true }> {
  const state = await getGameState(tableId);
  if (!state) throw new GameError('no_game', 'Нет активной игры');
  if (state.phase !== 'truth_dare') throw new GameError('bad_phase', 'Карточка не активна');
  // Завершить карту может спиннер ИЛИ цель
  if (completerId !== state.spinnerId && completerId !== state.targetId) {
    throw new GameError('not_your_card', 'Не твоя карточка');
  }
  return advanceSpinner(state);
}

/** Перейти к следующему спиннеру или завершить игру. */
async function advanceSpinner(state: GameState): Promise<{ state: GameState; nextSpinnerId: number } | { ended: true }> {
  state.currentStep += 1;
  if (state.currentStep >= state.totalSteps) {
    return finishGame(state);
  }

  const players = await prisma.tablePlayer.findMany({
    where: { tableId: state.tableId, status: 'active' },
    orderBy: { slotIndex: 'asc' },
    select: { userId: true, slotIndex: true },
  });
  if (players.length < 2) {
    return finishGame(state);
  }

  const currentIdx = players.findIndex((p: { userId: number }) => p.userId === state.spinnerId);
  const next = players[(currentIdx + 1) % players.length];

  state.spinnerId = next.userId;
  state.targetId = null;
  state.phase = 'awaiting_spin';
  state.rotationDeg = null;
  state.card = null;
  state.cardDeadline = null;
  state.choice = null;
  state.spinStartAt = null;
  state.spinEndAt = null;
  await saveGameState(state);

  await prisma.game.update({
    where: { id: state.gameId },
    data: { currentStep: state.currentStep, currentSpinnerId: state.spinnerId, currentTargetId: null },
  });

  return { state, nextSpinnerId: state.spinnerId };
}

async function finishGame(state: GameState): Promise<{ ended: true }> {
  state.phase = 'finished';
  await saveGameState(state);
  await prisma.game.update({
    where: { id: state.gameId },
    data: { status: 'finished', finishedAt: new Date() },
  });
  await prisma.table.update({
    where: { id: state.tableId },
    data: { status: 'waiting', currentGameId: null },
  });
  await deleteGameState(state.tableId);
  return { ended: true };
}

/** Получить slotIndex всех игроков за столом. */
export async function getSlotMap(tableId: number): Promise<{ map: Record<number, number>; total: number; slots: number }> {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: { maxPlayers: true },
  });
  const players = await prisma.tablePlayer.findMany({
    where: { tableId, status: 'active' },
    select: { userId: true, slotIndex: true },
  });
  const map: Record<number, number> = {};
  for (const p of players) map[p.userId] = p.slotIndex;
  return { map, total: players.length, slots: table?.maxPlayers ?? 12 };
}

export class GameError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
