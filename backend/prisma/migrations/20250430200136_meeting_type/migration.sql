-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ONE_ON_ONE', 'SIX_MONTH_REVIEW', 'TWELVE_MONTH_REVIEW');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "meetingType" "MeetingType" NOT NULL DEFAULT 'ONE_ON_ONE';
