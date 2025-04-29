/*
  Warnings:

  - A unique constraint covering the columns `[meetingBaasId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "meetingBaasId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_meetingBaasId_key" ON "Meeting"("meetingBaasId");
