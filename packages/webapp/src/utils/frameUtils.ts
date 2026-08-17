import { useEconomyStore } from '../store/economyStore';

/**
 * Получить imageUrl рамки по её ID.
 * Если frameId null, 'none' или рамка не найдена — вернёт null.
 */
export function getFrameImageUrl(frameId: string | null): string | null {
  if (!frameId || frameId === 'none') return null;
  
  const frames = useEconomyStore.getState().frames;
  const frame = frames.find(f => f.id === frameId);
  
  return frame?.imageUrl || null;
}
