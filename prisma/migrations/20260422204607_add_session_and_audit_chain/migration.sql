/*
  Warnings:

  - Added the required column `rowHash` to the `DecisionLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DecisionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "creditLimit" REAL,
    "denialReason" TEXT,
    "explanation" TEXT NOT NULL,
    "prevHash" TEXT,
    "rowHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DecisionLog_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DecisionLog" ("approved", "createdAt", "creditLimit", "denialReason", "explanation", "id", "profileId", "score", "snapshotId", "userId") SELECT "approved", "createdAt", "creditLimit", "denialReason", "explanation", "id", "profileId", "score", "snapshotId", "userId" FROM "DecisionLog";
DROP TABLE "DecisionLog";
ALTER TABLE "new_DecisionLog" RENAME TO "DecisionLog";
CREATE UNIQUE INDEX "DecisionLog_rowHash_key" ON "DecisionLog"("rowHash");
CREATE INDEX "DecisionLog_userId_idx" ON "DecisionLog"("userId");
CREATE INDEX "DecisionLog_snapshotId_idx" ON "DecisionLog"("snapshotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
