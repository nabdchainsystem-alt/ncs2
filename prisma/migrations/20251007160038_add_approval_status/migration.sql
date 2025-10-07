-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "departmentId" TEXT,
    "warehouseId" TEXT,
    "machineId" TEXT,
    "vendorId" TEXT,
    "priority" TEXT NOT NULL,
    "neededBy" DATETIME,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("code", "createdAt", "departmentId", "description", "id", "machineId", "neededBy", "priority", "status", "updatedAt", "vendorId", "warehouseId") SELECT "code", "createdAt", "departmentId", "description", "id", "machineId", "neededBy", "priority", "status", "updatedAt", "vendorId", "warehouseId" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE UNIQUE INDEX "Request_code_key" ON "Request"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
