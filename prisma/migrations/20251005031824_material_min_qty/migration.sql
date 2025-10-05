-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minQty" DECIMAL NOT NULL DEFAULT 0,
    "warehouseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Material" ("category", "code", "createdAt", "id", "name", "unit", "updatedAt", "warehouseId") SELECT "category", "code", "createdAt", "id", "name", "unit", "updatedAt", "warehouseId" FROM "Material";
DROP TABLE "Material";
ALTER TABLE "new_Material" RENAME TO "Material";
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
