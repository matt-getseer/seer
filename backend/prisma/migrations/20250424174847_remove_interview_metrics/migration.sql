/*
  Warnings:

  - You are about to drop the column `communicationScore` on the `InterviewAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `cultureScore` on the `InterviewAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `InterviewAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `overallRating` on the `InterviewAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `technicalScore` on the `InterviewAnswer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewAnswer" DROP COLUMN "communicationScore",
DROP COLUMN "cultureScore",
DROP COLUMN "notes",
DROP COLUMN "overallRating",
DROP COLUMN "technicalScore";
