import { PrismaClient } from '@prisma/client';
import { GIFT_CATALOG_SEED, BOTTLE_SKINS_SEED } from '@spinthe/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // Бутылочки
  for (const b of BOTTLE_SKINS_SEED) {
    await prisma.bottleCatalog.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        name: b.name,
        imageUrl: b.imageUrl,
        priceHearts: b.priceHearts,
        eventId: null,
        sortOrder: 0,
        isActive: true,
      },
    });
  }

  // Рамки
  const frames = [
    { id: 'none', name: 'Без рамки', imageUrl: '', priceHearts: null, locked: false, sortOrder: 0 },
    { id: 'fantasy', name: 'Фэнтези', imageUrl: '/frames/fantasy.png', priceHearts: 500, locked: false, sortOrder: 1 },
    { id: 'egypt', name: 'Египет', imageUrl: '/frames/egypt.png', priceHearts: 500, locked: false, sortOrder: 2 },
    { id: 'vostok', name: 'Восток', imageUrl: '/frames/1.png', priceHearts: 500, locked: false, sortOrder: 3 },
    { id: '1', name: 'Восток', imageUrl: '/frames/1.png', priceHearts: 500, locked: false, sortOrder: 4 },
    { id: '2', name: 'Премиум Золото', imageUrl: '/frames/2.png', priceHearts: 500, locked: false, sortOrder: 5 },
    { id: '3', name: 'Рубин', imageUrl: '/frames/3.png', priceHearts: 500, locked: false, sortOrder: 6 },
    { id: 'casino', name: 'Казино', imageUrl: '/frames/casino.svg', priceHearts: 500, locked: false, sortOrder: 7 },
    { id: 'cards', name: 'Карты', imageUrl: '/frames/cards.svg', priceHearts: 500, locked: false, sortOrder: 8 },
    { id: 'moon', name: 'Луна и звёзды', imageUrl: '/frames/moon.svg', priceHearts: 500, locked: false, sortOrder: 9 },
    { id: 'rainbow', name: 'Облака и радуга', imageUrl: '/frames/rainbow.svg', priceHearts: 500, locked: false, sortOrder: 10 },
    { id: 'neon', name: 'Неоновая', imageUrl: '/frames/neon.svg', priceHearts: 500, locked: false, sortOrder: 11 },
    { id: 'chains', name: 'Цепи и огонь', imageUrl: '/frames/chains.svg', priceHearts: 500, locked: false, sortOrder: 12 },
    { id: 'candy', name: 'Карамель', imageUrl: '/frames/candy.svg', priceHearts: 500, locked: false, sortOrder: 13 },
    { id: 'purple', name: 'Фиолетовая', imageUrl: '/frames/purple.svg', priceHearts: 500, locked: false, sortOrder: 14 },
    { id: 'teal', name: 'Бирюзовая', imageUrl: '/frames/teal.svg', priceHearts: 500, locked: false, sortOrder: 15 },
    { id: 'gothic', name: 'Готика', imageUrl: '/frames/gothic.svg', priceHearts: 500, locked: false, sortOrder: 16 },
    { id: 'plants', name: 'Природа', imageUrl: '/frames/plants.svg', priceHearts: 500, locked: false, sortOrder: 17 },
    { id: 'vip', name: 'VIP Рамка', imageUrl: '/frames/vip.svg', priceHearts: 500, locked: false, sortOrder: 18 },
  ];
  for (const f of frames) {
    await prisma.frameCatalog.upsert({
      where: { id: f.id },
      update: {
        name: f.name,
        imageUrl: f.imageUrl,
        priceHearts: f.priceHearts,
        locked: f.locked,
        sortOrder: f.sortOrder,
      },
      create: f as any,
    });
  }

  // Подарки
  for (const g of GIFT_CATALOG_SEED) {
    await prisma.giftCatalog.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        priceHearts: g.priceHearts,
        isEvent: false,
        eventId: null,
        sortOrder: g.sortOrder,
        isActive: true,
      },
    });
  }

  // Бустеры
  const boosters = [
    { id: 'fire_kiss', name: 'Огненный поцелуй', description: 'Увеличивает шанс взаимного поцелуя', category: 'choice', imageUrl: '/boosters/fire-lips.png', priceHearts: 50 },
    { id: 'clap', name: 'Аплодисменты', description: 'Мягкий отказ без потери рейтинга', category: 'choice', imageUrl: '/boosters/clap.png', priceHearts: 30 },
    { id: 'star_x2', name: 'x2 очка', description: 'Удваивает очки лиги на время', category: 'league', imageUrl: '/boosters/star-x2.png', priceHearts: 100 },
    { id: 'kiss_up', name: 'Поцелуй+', description: 'Больше очков за поцелуй', category: 'league', imageUrl: '/boosters/kiss-up.png', priceHearts: 75 },
  ];
  for (const b of boosters) {
    await prisma.boosterCatalog.upsert({ where: { id: b.id }, update: {}, create: b as any });
  }

  // Достижения
  const achievements = [
    { id: 'alien', name: 'Пришелец', description: 'Тайное достижение', imageUrl: '/achievements/alien.png', starsTotal: 5, sortOrder: 1 },
    { id: 'battleship', name: 'Корабль', description: 'Проведи 100 игр', imageUrl: '/achievements/ship.png', starsTotal: 5, sortOrder: 2 },
    { id: 'guitar', name: 'Рок-н-ролл', description: 'Получи 50 поцелуев под музыку', imageUrl: '/achievements/guitar.png', starsTotal: 5, sortOrder: 3 },
    { id: 'coffee_bag', name: 'Кофеман', description: 'Подари 100 чашек кофе', imageUrl: '/achievements/coffee-bag.png', starsTotal: 5, sortOrder: 4 },
    { id: 'shaker', name: 'Бармен', description: 'Подари 50 коктейлей', imageUrl: '/achievements/shaker.png', starsTotal: 5, sortOrder: 5 },
    { id: 'eiffel', name: 'Романтик', description: 'Найди свою любовь в Париже', imageUrl: '/achievements/eiffel.png', starsTotal: 5, sortOrder: 6 },
    { id: 'gift_box', name: 'Щедрый', description: 'Подари 1000 подарков', imageUrl: '/achievements/gift.png', starsTotal: 5, sortOrder: 7 },
    { id: 'anchor', name: 'Моряк', description: 'Проведи 100 часов в игре', imageUrl: '/achievements/anchor.png', starsTotal: 5, sortOrder: 8 },
    { id: 'star_shades', name: 'Звезда', description: 'Попади в топ-100 рейтинга', imageUrl: '/achievements/star-shades.png', starsTotal: 5, sortOrder: 9 },
    { id: 'energy_mug', name: 'Энерджайзер', description: 'Проведи ночь в игре', imageUrl: '/achievements/energy-mug.png', starsTotal: 5, sortOrder: 10 },
    { id: 'party', name: 'Душа компании', description: 'Пригласи 10 друзей', imageUrl: '/achievements/party-popper.png', starsTotal: 5, sortOrder: 11 },
    { id: 'bagel', name: 'Сладкоежка', description: 'Подари 500 сладких подарков', imageUrl: '/achievements/bagel.png', starsTotal: 5, sortOrder: 12 },
  ];
  for (const a of achievements) {
    await prisma.achievementCatalog.upsert({ where: { id: a.id }, update: {}, create: a as any });
  }

  console.log('✅ Seeding complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
