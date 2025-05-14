/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Team` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_departmentId_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "departmentId";
