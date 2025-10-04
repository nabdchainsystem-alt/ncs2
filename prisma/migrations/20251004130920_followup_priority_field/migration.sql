-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RequestFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequestFollowUp_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequestFollowUp" ("createdAt", "dueDate", "id", "notes", "requestId", "status", "title", "updatedAt") SELECT "createdAt", "dueDate", "id", "notes", "requestId", "status", "title", "updatedAt" FROM "RequestFollowUp";
DROP TABLE "RequestFollowUp";
ALTER TABLE "new_RequestFollowUp" RENAME TO "RequestFollowUp";
CREATE INDEX "RequestFollowUp_dueDate_idx" ON "RequestFollowUp"("dueDate");
CREATE INDEX "RequestFollowUp_requestId_idx" ON "RequestFollowUp"("requestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
