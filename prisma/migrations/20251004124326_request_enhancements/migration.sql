-- CreateTable
CREATE TABLE "RequestActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestActivity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequestFollowUp_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RequestActivity_createdAt_idx" ON "RequestActivity"("createdAt");

-- CreateIndex
CREATE INDEX "RequestActivity_requestId_idx" ON "RequestActivity"("requestId");

-- CreateIndex
CREATE INDEX "RequestFollowUp_dueDate_idx" ON "RequestFollowUp"("dueDate");

-- CreateIndex
CREATE INDEX "RequestFollowUp_requestId_idx" ON "RequestFollowUp"("requestId");
