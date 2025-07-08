/*
  Warnings:

  - The primary key for the `researcher_study` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `study` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `study` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `studyId` on the `blockchain_sync` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studyId` on the `dataset_reference` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studyId` on the `researcher_study` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "blockchain_sync" DROP CONSTRAINT "blockchain_sync_studyId_fkey";

-- DropForeignKey
ALTER TABLE "dataset_reference" DROP CONSTRAINT "dataset_reference_studyId_fkey";

-- DropForeignKey
ALTER TABLE "researcher_study" DROP CONSTRAINT "researcher_study_studyId_fkey";

-- AlterTable
ALTER TABLE "blockchain_sync" DROP COLUMN "studyId",
ADD COLUMN     "studyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "dataset_reference" DROP COLUMN "studyId",
ADD COLUMN     "studyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "researcher_study" DROP CONSTRAINT "researcher_study_pkey",
DROP COLUMN "studyId",
ADD COLUMN     "studyId" INTEGER NOT NULL,
ADD CONSTRAINT "researcher_study_pkey" PRIMARY KEY ("researcherId", "studyId");

-- AlterTable
ALTER TABLE "study" DROP CONSTRAINT "study_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "study_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "researcher_study" ADD CONSTRAINT "researcher_study_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_reference" ADD CONSTRAINT "dataset_reference_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_sync" ADD CONSTRAINT "blockchain_sync_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
