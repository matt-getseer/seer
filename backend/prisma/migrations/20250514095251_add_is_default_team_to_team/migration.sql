-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isDefaultTeam" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Team_organizationId_isDefaultTeam_idx" ON "Team"("organizationId", "isDefaultTeam");
