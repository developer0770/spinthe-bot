import React from 'react';
import { useEconomyStore } from '../store/economyStore';

/**
 * Получить imageUrl рамки по её ID.
 * Если frameId null, '' или 'none' — вернёт null.
 * Если рамка найдена в store — возвращает её imageUrl.
 * Иначе авто-возвращает дефолтный путь по конвенции: /frames/${frameId}.svg
 */
export function getFrameImageUrl(frameId: string | null | undefined): string | null {
  if (!frameId || frameId === 'none') return null;

  const frames = useEconomyStore.getState().frames;
  const frame = frames.find((f) => f.id === frameId);

  if (frame && frame.imageUrl) {
    return frame.imageUrl;
  }

  // Проверка расширения / фолбэк по конвенции
  if (frameId.endsWith('.png') || frameId.endsWith('.svg')) {
    return frameId.startsWith('/') ? frameId : `/frames/${frameId}`;
  }

  return `/frames/${frameId}.svg`;
}

/**
 * Обработчик ошибок загрузки изображений рамок.
 * Если файл с расширением .png дает 404, автоматически пробует .svg (и наоборот).
 * Если оба варианта не загрузились — скрывает элемент.
 */
export function handleFrameError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget;
  const dataset = img.dataset;

  if (!dataset.retried) {
    dataset.retried = 'true';
    if (img.src.endsWith('.png')) {
      img.src = img.src.replace(/\.png$/, '.svg');
      return;
    } else if (img.src.endsWith('.svg')) {
      img.src = img.src.replace(/\.svg$/, '.png');
      return;
    }
  }

  img.style.display = 'none';
}

