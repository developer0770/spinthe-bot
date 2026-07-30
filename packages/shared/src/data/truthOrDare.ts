/**
 * База вопросов "Правда" и заданий "Действие" для игры.
 * Вопросы подобраны в лёгком, флиртовом ключе для взрослых, но без 18+.
 */

export interface TruthCard {
  id: string;
  text: string;
  category?: 'mild' | 'medium' | 'hot';
}
export interface DareCard {
  id: string;
  text: string;
  category?: 'mild' | 'medium' | 'hot';
}

export const TRUTHS: TruthCard[] = [
  { id: 't1', text: 'Кого из присутствующих ты считаешь самым симпатичным?', category: 'mild' },
  { id: 't2', text: 'Твой самый неловкий момент на свидании?', category: 'mild' },
  { id: 't3', text: 'С кем из игроков ты бы пошёл(шла) на свидание?', category: 'medium' },
  { id: 't4', text: 'Какой самый глупый поступок ты совершал(а) ради любви?', category: 'mild' },
  { id: 't5', text: 'Кого в этой комнате ты бы поцеловал(а) прямо сейчас?', category: 'hot' },
  { id: 't6', text: 'Твоя самая странная привычка?', category: 'mild' },
  { id: 't7', text: 'В кого ты был(а) влюблён(а) в последний раз?', category: 'medium' },
  { id: 't8', text: 'Самое безумное, что ты делал(а) на спор?', category: 'medium' },
  { id: 't9', text: 'Ты когда-нибудь подсматривал(а) за кем-то? Расскажи.', category: 'medium' },
  { id: 't10', text: 'Кто из игроков(ов) больше всего похож на твой идеал?', category: 'hot' },
  { id: 't11', text: 'Чего ты больше всего боишься в отношениях?', category: 'mild' },
  { id: 't12', text: 'Сколько сердечек ты готов(а) подарить незнакомцу?', category: 'mild' },
  { id: 't13', text: 'Самая романтичная вещь, что с тобой случалась?', category: 'mild' },
  { id: 't14', text: 'Ты бы согласился(ась) на свидание вслепую?', category: 'mild' },
  { id: 't15', text: 'Какая песня лучше всего описывает твою любовную жизнь?', category: 'medium' },
];

export const DARES: DareCard[] = [
  { id: 'd1', text: 'Пошли воздушный поцелуй всем в чате 💋', category: 'mild' },
  { id: 'd2', text: 'Сделай комплимент каждому из игроков по очереди', category: 'mild' },
  { id: 'd3', text: 'Спой строчку из своей любимой песни в чат', category: 'mild' },
  { id: 'd4', text: 'Отправь самый смешной эмодзи, какой у тебя есть 😄', category: 'mild' },
  { id: 'd5', text: 'Подари виртуальный сердечко ❤️ тому, кто тебе нравится', category: 'medium' },
  { id: 'd6', text: 'Сделай селфи с самым дурацким выражением лица и поделись (если хочешь)', category: 'medium' },
  { id: 'd7', text: 'Напиши стих из 4 строк про того, на кого указала бутылочка', category: 'medium' },
  { id: 'd8', text: 'Отправь 5 комплиментов цели этого раунда', category: 'hot' },
  { id: 'd9', text: 'Расскажи анекдот так, чтобы все рассмеялись', category: 'mild' },
  { id: 'd10', text: 'Добавь в ник сердечко ❤️ на следующие 3 раунда', category: 'mild' },
  { id: 'd11', text: 'Назови 3 вещи, которые ты ценишь в людях больше всего', category: 'mild' },
  { id: 'd12', text: 'Признайся в симпатии цели раунда одним смайликом 😳', category: 'hot' },
  { id: 'd13', text: 'Изобрази любимое животное в чате текстом или эмодзи', category: 'mild' },
  { id: 'd14', text: 'Напиши "Я тебя люблю" и отправь случайному игроку в ЛС (в игре)', category: 'hot' },
  { id: 'd15', text: 'Пошли стикер, который лучше всего описывает твоё настроение сейчас', category: 'mild' },
];

export function pickRandomTruth(): TruthCard {
  return TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
}

export function pickRandomDare(): DareCard {
  return DARES[Math.floor(Math.random() * DARES.length)];
}
