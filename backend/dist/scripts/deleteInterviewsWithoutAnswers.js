"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env node */
/* global console, process */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        // First, get all interviews with answers to find the IDs we want to keep
        const interviewsWithAnswers = await prisma.$queryRaw `
      SELECT "interviewId" FROM "InterviewAnswer"
    `;
        const interviewIdsWithAnswers = interviewsWithAnswers.map(answer => answer.interviewId);
        // Find all interviews that don't have associated answers
        const interviewsWithoutAnswers = await prisma.interview.findMany({
            where: {
                id: {
                    notIn: interviewIdsWithAnswers.length > 0 ? interviewIdsWithAnswers : [-1] // Prevent empty array error
                }
            }
        });
        console.log(`Found ${interviewsWithoutAnswers.length} interviews without answers`);
        // Delete interviews without answers
        if (interviewsWithoutAnswers.length > 0) {
            const deleteResult = await prisma.interview.deleteMany({
                where: {
                    id: {
                        in: interviewsWithoutAnswers.map(interview => interview.id)
                    }
                }
            });
            console.log(`Deleted ${deleteResult.count} interviews without answers`);
        }
        else {
            console.log('No interviews without answers to delete');
        }
    }
    catch (error) {
        console.error('Error deleting interviews without answers:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
