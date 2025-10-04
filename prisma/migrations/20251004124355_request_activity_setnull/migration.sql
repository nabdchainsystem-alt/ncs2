-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RequestActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestActivity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequestActivity" ("action", "createdAt", "detail", "id", "requestId") SELECT "action", "createdAt", "detail", "id", "requestId" FROM "RequestActivity";
DROP TABLE "RequestActivity";
ALTER TABLE "new_RequestActivity" RENAME TO "RequestActivity";
CREATE INDEX "RequestActivity_createdAt_idx" ON "RequestActivity"("createdAt");
CREATE INDEX "RequestActivity_requestId_idx" ON "RequestActivity"("requestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
