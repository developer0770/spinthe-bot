-- Add room-related fields to Table (rooms)

-- CreateEnum TableStatus (we use text values so convert existing "status" string)
-- Start by adding new columns with defaults for existing rows (safe in dev).

ALTER TABLE "Table"
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "roomCode" TEXT,
  ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hostId" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxPlayers" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS "totalRounds" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "currentGameId" TEXT,
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- Ensure existing tables have a hostId (pick the first player per table, fallback 1)
UPDATE "Table" t
SET "hostId" = COALESCE(
  (SELECT "userId" FROM "TablePlayer" tp
   WHERE tp."tableId" = t.id AND tp."status" = 'active'
   ORDER BY tp."joinedAt" ASC LIMIT 1),
  (SELECT id FROM "User" ORDER BY id ASC LIMIT 1)
)
WHERE t."hostId" IS NULL;

-- Generate unique 6-digit codes for existing tables
UPDATE "Table"
SET "roomCode" = LPAD(FLOOR(100000 + RANDOM() * 899999)::TEXT, 6, '0')
WHERE "roomCode" IS NULL OR "roomCode" = '';

-- Convert status to enum-like constraint (keep as TEXT but add CHECK)
-- We won't switch column type to native enum to keep things simple; validation is in code.

ALTER TABLE "Table" ALTER COLUMN "hostId" SET NOT NULL;
ALTER TABLE "Table" ALTER COLUMN "roomCode" SET NOT NULL;

-- Add unique + FK
ALTER TABLE "Table" ADD CONSTRAINT "Table_roomCode_key" UNIQUE ("roomCode");
ALTER TABLE "Table" ADD CONSTRAINT "Table_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Table_roomCode_idx" ON "Table"("roomCode");
CREATE INDEX IF NOT EXISTS "Table_isPrivate_status_idx" ON "Table"("isPrivate", "status");
CREATE INDEX IF NOT EXISTS "TablePlayer_userId_status_idx" ON "TablePlayer"("userId", "status");
