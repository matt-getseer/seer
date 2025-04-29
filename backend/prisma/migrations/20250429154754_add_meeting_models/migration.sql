-- CreateTable
CREATE TABLE "Meeting" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "platform" TEXT,
    "audioFileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "managerId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "languageCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInsight" (
    "id" SERIAL NOT NULL,
    "meetingId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_managerId_idx" ON "Meeting"("managerId");

-- CreateIndex
CREATE INDEX "Meeting_employeeId_idx" ON "Meeting"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_meetingId_key" ON "Transcript"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingInsight_meetingId_idx" ON "MeetingInsight"("meetingId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInsight" ADD CONSTRAINT "MeetingInsight_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
