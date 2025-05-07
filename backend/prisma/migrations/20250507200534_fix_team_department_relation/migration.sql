/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Team` table. All the data in the column will be lost.
  - Made the column `departmentId` on table `Team` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Team_departmentId_idx";

-- DropIndex
DROP INDEX "Team_name_organizationId_key";

-- DropIndex
DROP INDEX "Team_organizationId_idx";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "createdAt",
DROP COLUMN "department",
DROP COLUMN "updatedAt",
ALTER COLUMN "departmentId" SET NOT NULL;
