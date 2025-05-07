"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessibleTeams = getAccessibleTeams;
exports.getAccessibleEmployees = getAccessibleEmployees;
exports.getAccessibleMeetings = getAccessibleMeetings;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper function to get all user IDs in a manager's hierarchy
async function getManagerialHierarchy(managerUserId) {
    const managerEmployee = await prisma.employee.findFirst({
        where: { userId: managerUserId },
    });
    if (!managerEmployee) {
        // This manager is not listed as an employee, so cannot have reports.
        // Or, the user is not an employee at all.
        // Depending on strictness, you might throw an error or return just their own ID if they are a manager.
        // For now, returning just their ID if they are a manager but not in employee table for hierarchy.
        const managerUser = await prisma.user.findUnique({ where: { id: managerUserId } });
        if (managerUser && managerUser.role === client_1.UserRole.MANAGER) {
            return [managerUserId];
        }
        return [];
    }
    let accessibleManagerUserIds = new Set([managerUserId]);
    let queue = [managerEmployee.id]; // Queue of employee IDs to process
    while (queue.length > 0) {
        const currentManagerEmployeeId = queue.shift();
        const directReports = await prisma.employee.findMany({
            where: { managerId: currentManagerEmployeeId },
            include: { user: { select: { role: true, id: true } } }, // Include user to check role and get userId
        });
        for (const report of directReports) {
            if (report.user && report.user.role === client_1.UserRole.MANAGER) {
                if (!accessibleManagerUserIds.has(report.userId)) {
                    accessibleManagerUserIds.add(report.userId);
                    // Add this manager's employee ID to the queue to find *their* reports
                    queue.push(report.id);
                }
            }
        }
    }
    return Array.from(accessibleManagerUserIds);
}
async function getAccessibleTeams(currentUser) {
    if (currentUser.role === client_1.UserRole.ADMIN) {
        return prisma.team.findMany({
            include: {
                employees: {
                    select: {
                        id: true,
                        name: true,
                        title: true,
                        email: true,
                        startDate: true
                    }
                }
            }
        });
    }
    if (currentUser.role === client_1.UserRole.MANAGER) {
        const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
        if (managerUserIdsInHierarchy.length === 0)
            return [];
        return prisma.team.findMany({
            where: {
                userId: {
                    in: managerUserIdsInHierarchy,
                },
            },
            include: {
                employees: {
                    select: {
                        id: true,
                        name: true,
                        title: true,
                        email: true,
                        startDate: true
                    }
                }
            }
        });
    }
    if (currentUser.role === client_1.UserRole.USER) {
        // Find the employee record for the current user
        const employee = await prisma.employee.findFirst({
            where: { userId: currentUser.id },
            select: { teamId: true }
        });
        if (employee && employee.teamId) {
            return prisma.team.findMany({
                where: { id: employee.teamId }
                // No longer including the 'employees' field here for the USER role's own team view,
                // as the EmployeeProfile page for the user themselves primarily uses employee.team.name/department
                // which comes from the getAccessibleEmployees call.
            });
        }
        return []; // User is not associated with any team or not an employee
    }
    // Fallback for any other roles or if no conditions met prior
    return [];
}
async function getAccessibleEmployees(currentUser) {
    if (currentUser.role === client_1.UserRole.ADMIN) {
        return prisma.employee.findMany({
            include: {
                user: true, // To get user details like role
                team: true,
                Employee: true, // Manager
                other_Employee: true, // Direct reports
            }
        });
    }
    if (currentUser.role === client_1.UserRole.MANAGER) {
        const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
        if (managerUserIdsInHierarchy.length === 0)
            return [];
        const accessibleTeams = await prisma.team.findMany({
            where: {
                userId: {
                    in: managerUserIdsInHierarchy,
                },
            },
            select: { id: true },
        });
        const accessibleTeamIds = accessibleTeams.map(team => team.id);
        if (accessibleTeamIds.length === 0)
            return [];
        return prisma.employee.findMany({
            where: {
                teamId: {
                    in: accessibleTeamIds,
                },
            },
            include: {
                user: true,
                team: true,
                Employee: true,
                other_Employee: true,
            }
        });
    }
    if (currentUser.role === client_1.UserRole.USER) {
        const employee = await prisma.employee.findFirst({
            where: { userId: currentUser.id },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }, // Select necessary user fields
                team: true,
                Employee: { select: { id: true, name: true, email: true } }, // Manager's basic info
                // other_Employee: false // Typically users don't see their direct reports list here unless they are also managers
            }
        });
        return employee ? [employee] : [];
    }
    return [];
}
async function getAccessibleMeetings(currentUser) {
    if (currentUser.role === client_1.UserRole.ADMIN) {
        return prisma.meeting.findMany({
            include: {
                manager: true,
                employee: { include: { team: true, user: true } },
                insights: true,
                transcript: true,
            }
        });
    }
    if (currentUser.role === client_1.UserRole.MANAGER) {
        const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
        if (managerUserIdsInHierarchy.length === 0)
            return [];
        const accessibleTeams = await prisma.team.findMany({
            where: {
                userId: {
                    in: managerUserIdsInHierarchy,
                },
            },
            select: { id: true },
        });
        const accessibleTeamIds = accessibleTeams.map(team => team.id);
        // Fetch employees belonging to the accessible teams to cover meetings involving them
        let employeeIdsInAccessibleTeams = [];
        if (accessibleTeamIds.length > 0) {
            const employeesInTeams = await prisma.employee.findMany({
                where: { teamId: { in: accessibleTeamIds } },
                select: { id: true }
            });
            employeeIdsInAccessibleTeams = employeesInTeams.map(emp => emp.id);
        }
        return prisma.meeting.findMany({
            where: {
                OR: [
                    {
                        managerId: {
                            in: managerUserIdsInHierarchy,
                        },
                    },
                    {
                        employeeId: {
                            in: employeeIdsInAccessibleTeams,
                        },
                    },
                ],
            },
            include: {
                manager: true,
                employee: { include: { team: true, user: true } },
                insights: true,
                transcript: true,
            }
        });
    }
    if (currentUser.role === client_1.UserRole.USER) {
        // Find the employee ID for the current user
        const employee = await prisma.employee.findFirst({
            where: { userId: currentUser.id },
            select: { id: true }
        });
        if (!employee) {
            // If the user is not an employee, they might still be a manager for meetings if managerId on Meeting is a userId
            // For now, assuming meetings are primarily linked via employeeId or a manager (User) directly.
            // If User can be a manager of a meeting without being an employee, this needs to be handled.
            // Let's assume managerId on Meeting refers to a User's ID.
            return prisma.meeting.findMany({
                where: {
                    managerId: currentUser.id, // Meetings managed directly by this user (if managerId is userId)
                },
                include: {
                    manager: true,
                    employee: { include: { team: true, user: { select: { id: true, name: true, email: true } } } },
                    insights: true, // Consider if users should see all insights for their meetings
                    transcript: true, // Consider if users should see transcripts
                }
            });
        }
        // User is an employee, find meetings they are involved in as an employee or as a manager (if managerId is userId)
        return prisma.meeting.findMany({
            where: {
                OR: [
                    { employeeId: employee.id }, // Meetings where the user is the employee participant
                    { managerId: currentUser.id } // Meetings where the user is the manager (assuming managerId on Meeting is userId)
                ]
            },
            include: {
                manager: { select: { id: true, name: true, email: true } }, // Basic info of manager
                employee: {
                    include: {
                        team: { select: { id: true, name: true } },
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                insights: true, // Re-evaluate if USER role should see all insights by default
                transcript: true, // Re-evaluate if USER role should see transcript by default
            }
        });
    }
    return [];
}
// Example User type (should come from Prisma Client, ensure it's correctly imported)
// interface User {
//   id: number;
//   role: UserRole;
//   // other fields...
// }
// Potentially add other specific access functions, e.g.:
// export async function canUserAccessTeam(userId: number, teamId: number): Promise<boolean> { ... }
// export async function canUserAccessEmployee(userId: number, employeeId: number): Promise<boolean> { ... }
// export async function canUserAccessMeeting(userId: number, meetingId: number): Promise<boolean> { ... } 
