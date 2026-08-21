import React from 'react';
import { useEconomyStore } from '../store/economyStore';

const BOTTLE_IMAGE_MAP: Record<string, string> = {
  classic_green: '/bottles/green.png',
  green: '/bottles/green.png',
  golden: '/bottles/goldb.png',
  goldb: '/bottles/goldb.png',
  blue: '/bottles/blue.png',
  prime: '/bottles/prime.png',
  cola: '/bottles/cocacola.png',
  cocacola: '/bottles/cocacola.png',
};

export const FALLBACK_BOTTLE_IMAGE = '/bottles/green.png';

/**
 * Получить imageUrl бутылочки по её ID или названию.
 */
export function getBottleImageUrl(bottleId: string | null | undefined): string {
  if (!bottleId) return FALLBACK_BOTTLE_IMAGE;

  // 1. Поиск в сторе магазина
  const bottles = useEconomyStore.getState().bottles;
  const bottle = bottles.find((b) => b.id === bottleId);
  if (bottle && bottle.imageUrl) {
    return bottle.imageUrl;
  }

  // 2. Известный маппинг по ID
  if (BOTTLE_IMAGE_MAP[bottleId]) {
    return BOTTLE_IMAGE_MAP[bottleId];
  }

  // 3. Прямой путь к файлу
  if (bottleId.startsWith('/')) {
    return bottleId;
  }

  if (bottleId.endsWith('.png') || bottleId.endsWith('.svg')) {
    return `/bottles/${bottleId}`;
  }

  return `/bottles/${bottleId}.png`;
}

/**
 * Обработчик ошибок загрузки картинок бутылок.
 * Выводит console.error для отладки и ставит фолбэк-картинку /bottles/green.png.
 */
export function handleBottleError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget;
  console.error(`[Bottle] Failed to load bottle image: ${img.src}`);

  const dataset = img.dataset;
  if (!dataset.retried) {
    dataset.retried = 'true';
    img.src = FALLBACK_BOTTLE_IMAGE;
  } else {
    img.style.opacity = '0.5';
  }
}
