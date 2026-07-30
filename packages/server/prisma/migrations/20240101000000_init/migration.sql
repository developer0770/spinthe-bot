-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" VARCHAR(64),
    "name" VARCHAR(64) NOT NULL DEFAULT '',
    "avatarUrl" VARCHAR(512),
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "languageCode" VARCHAR(8) NOT NULL DEFAULT 'ru',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "heartsBalance" INTEGER NOT NULL DEFAULT 0,
    "totalKisses" BIGINT NOT NULL DEFAULT 0,
    "activeBottleId" VARCHAR(32) NOT NULL DEFAULT 'classic_green',
    "activeFrameId" VARCHAR(32),
    "tutorialDone" BOOLEAN NOT NULL DEFAULT false,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "musicEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");
CREATE INDEX "User_totalKisses_idx" ON "User"("totalKisses");

-- CreateTable
CREATE TABLE "Table" (
    "id" SERIAL NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Table_tableNumber_key" ON "Table"("tableNumber");
CREATE INDEX "Table_status_idx" ON "Table"("status");

-- CreateTable
CREATE TABLE "TablePlayer" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TablePlayer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TablePlayer_tableId_slotIndex_key" ON "TablePlayer"("tableId", "slotIndex");
CREATE UNIQUE INDEX "TablePlayer_tableId_userId_key" ON "TablePlayer"("tableId", "userId");

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "tableId" INTEGER NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 5,
    "currentSpinnerId" INTEGER,
    "currentTargetId" INTEGER,
    "status" VARCHAR(16) NOT NULL DEFAULT 'waiting',
    "isTutorial" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Game_tableId_status_idx" ON "Game"("tableId", "status");

-- CreateTable
CREATE TABLE "Spin" (
    "id" SERIAL NOT NULL,
    "gameId" UUID NOT NULL,
    "step" INTEGER NOT NULL,
    "spinnerId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "choice" VARCHAR(8),
    "rotationDeg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spin_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Spin_gameId_idx" ON "Spin"("gameId");

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "tableId" INTEGER NOT NULL,
    "gameId" UUID,
    "senderId" INTEGER,
    "text" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL DEFAULT 'user',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_tableId_createdAt_idx" ON "Message"("tableId", "createdAt" DESC);

-- CreateTable
CREATE TABLE "GiftCatalog" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "priceHearts" INTEGER NOT NULL,
    "isEvent" BOOLEAN NOT NULL DEFAULT false,
    "eventId" VARCHAR(32),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GiftCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftInstance" (
    "id" SERIAL NOT NULL,
    "giftId" VARCHAR(32) NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "gameId" UUID,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courtship" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "tableId" INTEGER,
    "costHearts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Courtship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleCatalog" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "imageUrl" VARCHAR(256) NOT NULL,
    "priceHearts" INTEGER,
    "eventId" VARCHAR(32),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BottleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBottle" (
    "userId" INTEGER NOT NULL,
    "bottleId" VARCHAR(32) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBottle_pkey" PRIMARY KEY ("userId", "bottleId")
);

-- CreateTable
CREATE TABLE "FrameCatalog" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "imageUrl" VARCHAR(256) NOT NULL,
    "priceHearts" INTEGER,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FrameCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFrame" (
    "userId" INTEGER NOT NULL,
    "frameId" VARCHAR(32) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFrame_pkey" PRIMARY KEY ("userId", "frameId")
);

-- CreateTable
CREATE TABLE "BoosterCatalog" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(16) NOT NULL,
    "imageUrl" VARCHAR(256) NOT NULL,
    "priceHearts" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BoosterCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBooster" (
    "userId" INTEGER NOT NULL,
    "boosterId" VARCHAR(32) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserBooster_pkey" PRIMARY KEY ("userId", "boosterId")
);

-- CreateTable
CREATE TABLE "ActiveBooster" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "boosterId" VARCHAR(32) NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ActiveBooster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementCatalog" (
    "id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" VARCHAR(256) NOT NULL,
    "starsTotal" INTEGER NOT NULL DEFAULT 5,
    "requirement" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AchievementCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "userId" INTEGER NOT NULL,
    "achievementId" VARCHAR(32) NOT NULL,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" VARCHAR(32) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "subtitle" VARCHAR(128),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReward" (
    "id" SERIAL NOT NULL,
    "eventId" VARCHAR(32) NOT NULL,
    "rewardType" VARCHAR(16) NOT NULL,
    "rewardId" VARCHAR(32),
    "rewardAmount" INTEGER,
    "imageUrl" VARCHAR(256),
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "EventReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEventClaim" (
    "userId" INTEGER NOT NULL,
    "eventId" VARCHAR(32) NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEventClaim_pkey" PRIMARY KEY ("userId", "eventId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "telegramChargeId" VARCHAR(128),
    "starsAmount" INTEGER NOT NULL,
    "heartsAmount" INTEGER NOT NULL,
    "bonusHearts" INTEGER NOT NULL DEFAULT 0,
    "productType" VARCHAR(32) NOT NULL DEFAULT 'hearts_pack',
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_telegramChargeId_key" ON "Payment"("telegramChargeId");
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "inviterId" INTEGER NOT NULL,
    "inviteeId" INTEGER NOT NULL,
    "rewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_inviterId_inviteeId_key" ON "Referral"("inviterId", "inviteeId");

-- CreateTable
CREATE TABLE "RatingSnapshot" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(16) NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RatingSnapshot_category_period_userId_key" ON "RatingSnapshot"("category", "period", "userId");
CREATE INDEX "RatingSnapshot_category_period_score_idx" ON "RatingSnapshot"("category", "period", "score" DESC);

-- AddForeignKey
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TablePlayer" ADD CONSTRAINT "TablePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Game" ADD CONSTRAINT "Game_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_currentSpinnerId_fkey" FOREIGN KEY ("currentSpinnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_currentTargetId_fkey" FOREIGN KEY ("currentTargetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Spin" ADD CONSTRAINT "Spin_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Spin" ADD CONSTRAINT "Spin_spinnerId_fkey" FOREIGN KEY ("spinnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Spin" ADD CONSTRAINT "Spin_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "GiftCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftInstance" ADD CONSTRAINT "GiftInstance_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Courtship" ADD CONSTRAINT "Courtship_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Courtship" ADD CONSTRAINT "Courtship_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserBottle" ADD CONSTRAINT "UserBottle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBottle" ADD CONSTRAINT "UserBottle_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "BottleCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFrame" ADD CONSTRAINT "UserFrame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserFrame" ADD CONSTRAINT "UserFrame_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "FrameCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBooster" ADD CONSTRAINT "UserBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBooster" ADD CONSTRAINT "UserBooster_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "BoosterCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActiveBooster" ADD CONSTRAINT "ActiveBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "AchievementCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventReward" ADD CONSTRAINT "EventReward_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserEventClaim" ADD CONSTRAINT "UserEventClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEventClaim" ADD CONSTRAINT "UserEventClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RatingSnapshot" ADD CONSTRAINT "RatingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
