/*
  Warnings:

  - The primary key for the `patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `patientId` on the `dataset_reference` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `patient` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "dataset_reference" DROP CONSTRAINT "dataset_reference_patientId_fkey";

-- AlterTable
ALTER TABLE "dataset_reference" DROP COLUMN "patientId",
ADD COLUMN     "patientId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "patient" DROP CONSTRAINT "patient_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "patient_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "idx_dataset_patient" ON "dataset_reference"("patientId");

-- AddForeignKey
ALTER TABLE "dataset_reference" ADD CONSTRAINT "dataset_reference_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
