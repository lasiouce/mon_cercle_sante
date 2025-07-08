-- CreateTable
CREATE TABLE "patient" (
    "id" UUID NOT NULL,
    "walletAddress" CHAR(42) NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "birthYear" INTEGER,
    "weightKg" DECIMAL(5,2),
    "sex" CHAR(1),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher" (
    "id" UUID NOT NULL,
    "walletAddress" CHAR(42) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "institution" VARCHAR(255),
    "email" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study" (
    "id" VARCHAR(66) NOT NULL,
    "description" TEXT,
    "protocolUrl" VARCHAR(512),
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "researcher_study" (
    "researcherId" UUID NOT NULL,
    "studyId" VARCHAR(66) NOT NULL,
    "role" VARCHAR(50) NOT NULL,

    CONSTRAINT "researcher_study_pkey" PRIMARY KEY ("researcherId","studyId")
);

-- CreateTable
CREATE TABLE "dataset_reference" (
    "datasetHash" VARCHAR(66) NOT NULL,
    "patientId" UUID NOT NULL,
    "studyId" VARCHAR(66) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_reference_pkey" PRIMARY KEY ("datasetHash")
);

-- CreateTable
CREATE TABLE "measurement" (
    "id" SERIAL NOT NULL,
    "datasetHash" VARCHAR(66) NOT NULL,
    "measurementType" VARCHAR(10) NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "mealContext" VARCHAR(15),
    "labName" VARCHAR(100),
    "deviceModel" VARCHAR(50),

    CONSTRAINT "measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_sync" (
    "id" SERIAL NOT NULL,
    "studyId" VARCHAR(66) NOT NULL,
    "txHash" CHAR(66) NOT NULL,
    "action" VARCHAR(10) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "executedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_sync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_walletAddress_key" ON "patient"("walletAddress");

-- CreateIndex
CREATE INDEX "idx_patient_wallet_address" ON "patient"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "researcher_walletAddress_key" ON "researcher"("walletAddress");

-- CreateIndex
CREATE INDEX "idx_researcher_wallet" ON "researcher"("walletAddress");

-- CreateIndex
CREATE INDEX "idx_dataset_patient" ON "dataset_reference"("patientId");

-- CreateIndex
CREATE INDEX "idx_measurement_type" ON "measurement"("measurementType");

-- AddForeignKey
ALTER TABLE "study" ADD CONSTRAINT "study_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "researcher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_study" ADD CONSTRAINT "researcher_study_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "researcher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "researcher_study" ADD CONSTRAINT "researcher_study_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_reference" ADD CONSTRAINT "dataset_reference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_reference" ADD CONSTRAINT "dataset_reference_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement" ADD CONSTRAINT "measurement_datasetHash_fkey" FOREIGN KEY ("datasetHash") REFERENCES "dataset_reference"("datasetHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_sync" ADD CONSTRAINT "blockchain_sync_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
