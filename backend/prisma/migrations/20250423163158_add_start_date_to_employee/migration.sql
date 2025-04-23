/*
  Warnings:

  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "startDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "Task";
