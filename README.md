# 🍾 Целуй и Знакомься / Spin the Bottle

Полноценная Telegram Mini App игра «Бутылочка» — крути бутылочку, целуйся, общайся, дари подарки, заводи друзей.

## ✨ Возможности

- 🔐 **Telegram-авторизация** через HMAC-проверку initData + JWT
- 🍾 **3D-бутылочка** на Three.js с реалистичной физикой вращения и покачиванием
- 💋 **Игровой процесс**: вращение → случайный выбор цели → выбор «Поцеловать / Отказать» → карточки **«Правда или действие»** с таймером
- 🏠 **Комнаты**:
  - Быстрая игра (автоподбор)
  - Приватные комнаты по 6-значному коду
  - Публичные столы в общем списке
  - Лобби ожидания, код приглашения, хост может кикать и стартовать
  - До 12 игроков за столом, настраиваемое число раундов
- 💬 **Чат** в комнате с эмодзи-пикером
- 👥 **Друзья** — заявки, принятие, список онлайн
- 💌 **Личные сообщения** со стикерами
- 🔔 **Уведомления** о заявках, подарках, сообщениях
- 🛍️ **Магазин**:
  - Пакеты сердечек за Telegram Stars ⭐
  - Подарки (20+ предметов) с анимацией при дарении
  - Скины для бутылочки и рамки аватара
  - VIP-статус (золотая корона, бонусы)
- ❤️ **Экономика**: сердечки ❤️, монеты 🪙, алмазы 💎, опыт, уровни
- 🎁 **Ежедневные награды** (сердечки + монеты + алмазы раз в 20ч)
- 🏆 **Лидерборд** по категориям (поцелуи/сердца/уровень/подарки/друзья) и периодам
- 🛡️ **Админ-панель**: статистика, управление пользователями (бан/мут/кик/роль), жалобы, управление комнатами, закрытие столов
- 🎨 **Glassmorphism-дизайн**, тёмная тема, плавные анимации на Framer Motion, haptic feedback в Telegram

## 🧱 Технологии

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Framer Motion + Three.js + Zustand + Socket.IO-client + @twa-dev/sdk
- **Backend**: Node.js + Express + Socket.IO + Prisma ORM + JWT + ioredis
- **БД**: PostgreSQL 16 + Redis 7
- **Инфраструктура**: Docker, docker-compose, nginx

## 📁 Структура монорепозитория

```
spinthe-bot/
├── packages/
│   ├── shared/          # Общие типы TS, константы, база вопросов Правда/Действие
│   ├── server/          # Node.js backend (Express + Socket.IO + Prisma)
│   │   ├── prisma/      # Схема БД + миграции + seed
│   │   └── src/
│   │       ├── auth/    # Telegram HMAC + JWT
│   │       ├── modules/
│   │       │   ├── users/     # Профили
│   │       │   ├── rooms/     # Комнаты / лобби
│   │       │   ├── game/      # Логика раундов, вращений, карточек
│   │       │   ├── chat/      # Личные сообщения
│   │       │   ├── friends/   # Друзья и уведомления
│   │       │   ├── shop/      # Магазин, подарки, инвентарь, дейли, лидерборд
│   │       │   ├── economy/  # XP, уровни, балансы, награды
│   │       │   └── admin/     # Админка, жалобы, модерация
│   │       └── ws/            # Socket.IO шлюз
│   └── webapp/          # React Mini App (Vite)
│       └── src/
│           ├── components/    # UI-компоненты
│           ├── screens/       # Экраны приложения
│           ├── hooks/         # Кастомные хуки (в т.ч. WS)
│           ├── store/         # Zustand сторы
│           ├── api/           # REST-клиент
│           ├── socket/        # Socket.IO-клиент
│           └── utils/         # Telegram SDK-хелперы
├── docker-compose.yml
└── infra/nginx/         # Продакшн-конфиг nginx
```

## 🚀 Локальный запуск (для разработки)

### 1. Зависимости

- Node.js **20+**
- Docker и Docker Compose (для PostgreSQL/Redis)

### 2. Клонируйте репозиторий и установите зависимости

```bash
git clone <your-repo>
cd spinthe-bot
npm install
```

### 3. Запустите базы данных

```bash
docker compose up -d postgres redis
```

### 4. Инициализируйте БД (Prisma миграции + сидирование)

```bash
cd packages/server
npx prisma migrate dev     # применит миграции
npm run prisma:seed        # наполнит каталоги подарков, скинов, рамок и т.п.
cd ../..
```

### 5. Настройте переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Для разработки без реального Telegram токена будет работать dev-режим — при любом `BOT_TOKEN` вида `000000:AA...` бэкенд будет принимать тестовые initData и автоматически создавать dev-пользователей.

### 6. Запустите dev-серверы

```bash
npm run dev
```

- Фронтенд: http://localhost:5173
- Бэкенд: http://localhost:3000
- Prisma Studio (опционально, просмотр БД): `npm run prisma:studio -w packages/server`

Откройте http://localhost:5173 в браузере — приложение загрузится и автоматически создаст dev-пользователя.

## 🤖 Подключение Telegram BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправьте `/newbot`, следуйте инструкциям — получите **BOT_TOKEN** вида `123456789:ABCdef...`.
3. Вставьте токен в `.env` → `BOT_TOKEN=...`.
4. Создайте Web App для бота:
   - `/newapp` → выберите бота → введите название → введите URL (для локального теста используйте `https://t.me/username/app` или туннель ngrok; для продакшена — https://ваш-домен).
5. Установите кнопку меню:
   - `/setmenubutton` → выберите бота → введите название кнопки (например «Играть») → укажите URL Web App.
6. В BotFather включите режим инлайн-запросов и настройте описание/аватарку по вкусу.

Для локального теста в Telegram можно использовать **ngrok**:

```bash
ngrok http 5173
```

Вставьте https-адрес в BotFather как URL Web App.

## 🌍 Деплой на VPS (продакшен)

### Минимальные требования

- VPS с Ubuntu 22.04+, 2 ядра / 2 ГБ RAM
- Домен с SSL (Let's Encrypt)
- Установленные Docker и Docker Compose

### Шаги

1. Подключитесь к VPS:
   ```bash
   ssh root@your-server-ip
   ```

2. Установите Docker и Docker Compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. Скопируйте проект на сервер (git clone или scp).

4. Создайте `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Обязательно поменяйте:
   - `JWT_SECRET` — длинная случайная строка
   - `BOT_TOKEN` — токен из BotFather
   - `POSTGRES_PASSWORD` — надёжный пароль
   - `NODE_ENV=production`
   - `WEBAPP_URL=https://your-domain.com`
   - `VITE_API_URL=https://your-domain.com/api`
   - `VITE_WS_URL=wss://your-domain.com` (или оставьте пустым — будет использовать тот же origin)

5. Соберите и запустите все сервисы:
   ```bash
   docker compose up -d --build
   ```
   Поднимутся 4 контейнера: postgres, redis, server (бэкенд), webapp (nginx со статикой + прокси на /api и /socket.io).

6. Примените миграции (первый запуск):
   ```bash
   docker compose exec server sh -c "npx prisma migrate deploy && npx tsx prisma/seeds/seed.ts"
   ```

7. Настройте SSL через [Caddy](https://caddyserver.com/) или nginx + certbot перед 8080 портом, либо сразу разместите nginx на 80/443. Пример минимального Caddyfile:
   ```
   your-domain.com {
     reverse_proxy localhost:8080
   }
   ```

8. Проверьте:
   - `https://your-domain.com/health` должен вернуть `{ "ok": true }`
   - Откройте бота в Telegram, нажмите кнопку — должно открыться приложение.

### Обновление приложения

```bash
git pull
docker compose up -d --build
docker compose exec server npx prisma migrate deploy
```

### Бэкапы

Дамп PostgreSQL:
```bash
docker compose exec -T postgres pg_dump -U spinthe spinthe > backup_$(date +%F).sql
```

Восстановление:
```bash
cat backup.sql | docker compose exec -T postgres psql -U spinthe spinthe
```

## 🧪 Админ-панель

Чтобы сделать пользователя администратором (после первого входа):

```sql
UPDATE "User" SET role = 'admin' WHERE id = <your_user_id>;
```

После этого в профиле появится кнопка «🛡️ Админ-панель» со следующими разделами:

- **📊 Статистика** — пользователи, комнаты, сообщения, жалобы, VIP
- **👥 Пользователи** — поиск, бан/разбан, мут, кик, назначение модераторов
- **🚩 Жалобы** — рассмотрение репортов, бан/отклонить/принять
- **🍾 Комнаты** — список активных столов, принудительное закрытие

## 🎮 API и Socket.IO эндпоинты

### REST

| Метод | Путь                   | Описание                           |
|-------|------------------------|------------------------------------|
| POST  | `/api/auth/telegram`   | Авторизация через Telegram initData|
| GET   | `/api/users/me`        | Профиль текущего пользователя      |
| GET   | `/api/rooms/public`    | Список публичных комнат            |
| GET   | `/api/friends/`        | Список друзей и заявок             |
| POST  | `/api/friends/request/:id`  | Заявка в друзья                |
| POST  | `/api/friends/accept/:id`   | Принять заявку                 |
| GET   | `/api/dm/conversations`     | Список диалогов                |
| GET   | `/api/dm/:id`               | История ЛС                     |
| POST  | `/api/dm/:id`               | Отправить ЛС                   |
| GET   | `/api/shop/packs`      | Пакеты сердечек                    |
| POST  | `/api/shop/buy-pack/:id`    | Купить пакет                   |
| GET   | `/api/shop/gifts`      | Каталог подарков                   |
| POST  | `/api/shop/gift/:to/:gift`  | Подарить                       |
| GET   | `/api/shop/bottles` / `frames` | Каталог скинов              |
| POST  | `/api/shop/buy-bottle/:id` | Купить скин                    |
| POST  | `/api/shop/daily/claim`     | Забрать дейли-награду          |
| GET   | `/api/shop/leaderboard`     | Рейтинг                        |
| POST  | `/api/admin/report`    | Подать жалобу                      |
| GET   | `/api/admin/stats`    | (admin) Статистика                 |
| GET   | `/api/admin/users`    | (admin) Список пользователей       |
| POST  | `/api/admin/users/:id/ban` / `unban` / `mute` / `kick` | Управление |
| GET   | `/api/admin/reports`  | (admin) Жалобы                     |
| GET   | `/api/admin/tables`   | (admin) Комнаты                    |

### Socket.IO основные события

- `room:create`, `room:join`, `room:join_random`, `room:leave`, `room:kick`, `room:start`, `room:list_public`
- `game:spin`, `game:kiss`, `game:reject`, `game:ready`, `game:message`, `game:gift`
- `dm:send`, `friend:request`, `friend:accept`, `friend:remove`
- `room:joined`, `room:player_joined/left`, `room:game_started`
- `game:spin_started`, `game:spin_result`, `game:kissed`, `game:rejected`, `game:truth_or_dare`, `game:step_changed`
- `chat:message`, `chat:typing`
- `dm:message`, `notification:new`, `friend:request`, `friend:accepted`, `gift:received`, `gift:animate`
- `user:balance_changed`, `error`

## 🧰 Полезные скрипты

```bash
npm run dev                 # Запустить webapp + server одновременно
npm run build               # Собрать всё (продакшен)
npm run build:web           # Собрать только фронтенд
npm run build:server        # Собрать только бэкенд
npm run prisma:generate     # Перегенерировать Prisma client
cd packages/server
npx prisma studio           # GUI для просмотра БД (localhost:5555)
npx prisma migrate dev      # Создать и применить новую миграцию
npm run prisma:seed         # Пересидировать каталоги
```

## 🐛 Частые проблемы

1. **Бэкенд не стартует с ошибкой подключения к БД** — поднимите `docker compose up -d postgres redis`.
2. **Пустой экран в Telegram при открытии Web App** — проверьте, что URL указан с https и доступен извне; BotFather требует валидный SSL-сертификат.
3. **HMAC авторизация не проходит в dev** — убедитесь, что в `.env` стоит dev-`BOT_TOKEN` (000000:AAExample...) для локального теста вне Telegram.
4. **Большой размер бандла (warning chunks)** — Three.js сам по себе весит ~600KB; для продакшена включите gzip (включён в nginx-конфиге).

## 📜 Лицензия

MIT.

## 🏷️ Версия

v1.0.0 — все пункты ТЗ реализованы: авторизация, UI, комнаты с Socket.IO, игровой процесс с 3D-бутылочкой, чат/друзья/ЛС/стикеры/уведомления, магазин/подарки/экономика/дейли/лидерборд, админка с модерацией, докеризация и инструкции по деплою.
