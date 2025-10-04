-- CreateTable
CREATE TABLE "CompletedOrderTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "requestPriority" TEXT NOT NULL,
    "materialCode" TEXT,
    "itemName" TEXT NOT NULL,
    "qty" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    "transferStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "inventoryStatus" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompletedOrderTransfer_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompletedOrderTransfer_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "POItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CompletedOrderTransfer_poId_idx" ON "CompletedOrderTransfer"("poId");

-- CreateIndex
CREATE INDEX "CompletedOrderTransfer_transferStatus_idx" ON "CompletedOrderTransfer"("transferStatus");

-- CreateIndex
CREATE INDEX "CompletedOrderTransfer_inventoryStatus_idx" ON "CompletedOrderTransfer"("inventoryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedOrderTransfer_poItemId_key" ON "CompletedOrderTransfer"("poItemId");
