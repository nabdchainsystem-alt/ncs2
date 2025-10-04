-- CreateTable
CREATE TABLE "RFQ" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "vatPct" DECIMAL NOT NULL,
    "qty" DECIMAL NOT NULL,
    "totalExVat" DECIMAL NOT NULL,
    "totalIncVat" DECIMAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RFQ_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RFQ_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_quotationNo_key" ON "RFQ"("quotationNo");

-- CreateIndex
CREATE INDEX "RFQ_requestId_idx" ON "RFQ"("requestId");

-- CreateIndex
CREATE INDEX "RFQ_vendorId_idx" ON "RFQ"("vendorId");
