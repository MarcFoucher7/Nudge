-- User.icsToken : colonne optionnelle, remplie, puis obligatoire et unique
ALTER TABLE "User" ADD COLUMN "icsToken" TEXT;
UPDATE "User" SET "icsToken" = md5(random()::text || clock_timestamp()::text || id);
ALTER TABLE "User" ALTER COLUMN "icsToken" SET NOT NULL;
CREATE UNIQUE INDEX "User_icsToken_key" ON "User"("icsToken");

-- FocusSession
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "minutes" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FocusSession_userId_startedAt_idx" ON "FocusSession"("userId", "startedAt");
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
