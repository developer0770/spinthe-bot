export const MAX_PLAYERS_PER_TABLE = 12;
export const TUTORIAL_TOTAL_STEPS = 5;
export const DEFAULT_BOTTLE_ID = 'classic_green';
export const DEFAULT_FRAME_ID = 'none';
export const COURTSHIP_COST = 1;
export const BOTTLE_SKIN_PRICE = 5;
export const FRAME_PRICE = 500;
export const TUTORIAL_BONUS_HEARTS = 12;
export const INVITE_FRIEND_REWARD = 20;
export const COMPLIMENT_REWARD = 10;

export const GIFT_CATALOG_SEED = [
  { id: 'crown', name: 'Корона', emoji: '👑', priceHearts: 500, sortOrder: 1 },
  { id: 'kiss_mark', name: 'Поцелуй', emoji: '💋', priceHearts: 10, sortOrder: 2 },
  { id: 'diamond', name: 'Бриллиант', emoji: '💎', priceHearts: 1000, sortOrder: 3 },
  { id: 'strawberry', name: 'Клубника', emoji: '🍓', priceHearts: 15, sortOrder: 4 },
  { id: 'tomato', name: 'Помидор', emoji: '🍅', priceHearts: 5, sortOrder: 5 },
  { id: 'rose', name: 'Роза', emoji: '🌹', priceHearts: 50, sortOrder: 6 },
  { id: 'milk', name: 'Молоко', emoji: '🥛', priceHearts: 25, sortOrder: 7 },
  { id: 'teddy', name: 'Мишка', emoji: '🧸', priceHearts: 100, sortOrder: 8 },
  { id: 'ice_cream', name: 'Мороженое', emoji: '🍦', priceHearts: 30, sortOrder: 9 },
  { id: 'champagne', name: 'Шампанское', emoji: '🥂', priceHearts: 75, sortOrder: 10 },
  { id: 'wine', name: 'Вино', emoji: '🍷', priceHearts: 60, sortOrder: 11 },
  { id: 'cocktail', name: 'Коктейль', emoji: '🍸', priceHearts: 50, sortOrder: 12 },
  { id: 'cap_boss', name: 'Кепка BOSS', emoji: '🧢', priceHearts: 200, sortOrder: 13 },
  { id: 'emerald_ring', name: 'Кольцо с изумрудом', emoji: '💍', priceHearts: 1500, sortOrder: 14 },
  { id: 'beer', name: 'Пиво', emoji: '🍺', priceHearts: 40, sortOrder: 15 },
];

export const BOTTLE_SKINS_SEED = [
  { id: 'green', name: 'Зеленая', imageUrl: '/bottles/green.png', priceHearts: 0 },
  { id: 'golden', name: 'Золотая', imageUrl: '/bottles/goldb.png', priceHearts: BOTTLE_SKIN_PRICE },
  { id: 'blue', name: 'Синяя', imageUrl: '/bottles/blue.png', priceHearts: BOTTLE_SKIN_PRICE },
  { id: 'prime', name: 'Прайм', imageUrl: '/bottles/prime.png', priceHearts: BOTTLE_SKIN_PRICE },
  { id: 'cola', name: 'Кола', imageUrl: '/bottles/cocacola.png', priceHearts: BOTTLE_SKIN_PRICE },
];

export const HEART_PACKS = [
  { id: 'pack_50', hearts: 50, bonusPercent: 0, priceStars: 50, badge: null, imageUrl: '/icons/hearts-pack-50.png' },
  { id: 'pack_250', hearts: 250, bonusPercent: 0, priceStars: 250, badge: null, imageUrl: '/icons/hearts-pack-250.png' },
  { id: 'pack_500', hearts: 500, bonusPercent: 0, priceStars: 500, badge: null, imageUrl: '/icons/hearts-pack-500.png' },
  { id: 'pack_1200', hearts: 1200, bonusPercent: 20, priceStars: 1000, badge: 'hit' as const, imageUrl: '/icons/hearts-pack-1200.png' },
  { id: 'pack_3125', hearts: 3125, bonusPercent: 25, priceStars: 2500, badge: null, imageUrl: '/icons/hearts-pack-3125.png' },
  { id: 'pack_7000', hearts: 7000, bonusPercent: 40, priceStars: 5000, badge: 'best' as const, imageUrl: '/icons/hearts-pack-7000.png' },
];
