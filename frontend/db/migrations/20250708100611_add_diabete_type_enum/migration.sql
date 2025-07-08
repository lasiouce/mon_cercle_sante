-- CreateEnum
CREATE TYPE "DiabeteType" AS ENUM ('Type 1', 'Type 2');

-- AlterTable
ALTER TABLE "patient" ADD COLUMN     "diabeteType" "DiabeteType";
