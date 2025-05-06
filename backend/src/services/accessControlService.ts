import { PrismaClient, User, Team, Employee, Meeting, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get all user IDs in a manager's hierarchy
async function getManagerialHierarchy(managerUserId: number): Promise<number[]> {
  const managerEmployee = await prisma.employee.findFirst({
    where: { userId: managerUserId },
  });

  if (!managerEmployee) {
    // This manager is not listed as an employee, so cannot have reports.
    // Or, the user is not an employee at all.
    // Depending on strictness, you might throw an error or return just their own ID if they are a manager.
    // For now, returning just their ID if they are a manager but not in employee table for hierarchy.
    const managerUser = await prisma.user.findUnique({ where: { id: managerUserId } });
    if (managerUser && managerUser.role === UserRole.MANAGER) {
        return [managerUserId];
    }
    return [];
  }

  let accessibleManagerUserIds: Set<number> = new Set([managerUserId]);
  let queue: number[] = [managerEmployee.id]; // Queue of employee IDs to process

  while (queue.length > 0) {
    const currentManagerEmployeeId = queue.shift()!;
    
    const directReports = await prisma.employee.findMany({
      where: { managerId: currentManagerEmployeeId },
      include: { user: { select: { role: true, id: true } } }, // Include user to check role and get userId
    });

    for (const report of directReports) {
      if (report.user && report.user.role === UserRole.MANAGER) {
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

export async function getAccessibleTeams(currentUser: User): Promise<Team[]> {
  if (currentUser.role === UserRole.ADMIN) {
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

  if (currentUser.role === UserRole.MANAGER) {
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    if (managerUserIdsInHierarchy.length === 0) return [];

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

  // Regular USERS typically don't fetch lists of all accessible teams in this manner.
  // They might see their own team, which would be a different specific query.
  return [];
}

export async function getAccessibleEmployees(currentUser: User): Promise<Employee[]> {
  if (currentUser.role === UserRole.ADMIN) {
    return prisma.employee.findMany({
      include: {
        user: true, // To get user details like role
        team: true,
        Employee: true, // Manager
        other_Employee: true, // Direct reports
      }
    });
  }

  if (currentUser.role === UserRole.MANAGER) {
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    if (managerUserIdsInHierarchy.length === 0) return [];

    const accessibleTeams = await prisma.team.findMany({
      where: {
        userId: {
          in: managerUserIdsInHierarchy,
        },
      },
      select: { id: true },
    });
    const accessibleTeamIds = accessibleTeams.map(team => team.id);
    if (accessibleTeamIds.length === 0) return [];

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
  return [];
}

export async function getAccessibleMeetings(currentUser: User): Promise<Meeting[]> {
  if (currentUser.role === UserRole.ADMIN) {
    return prisma.meeting.findMany({
        include: {
            manager: true,
            employee: { include: { team: true, user: true } },
            insights: true,
            transcript: true,
        }
    });
  }

  if (currentUser.role === UserRole.MANAGER) {
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    if (managerUserIdsInHierarchy.length === 0) return [];
    
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
    let employeeIdsInAccessibleTeams: number[] = [];
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
          { // Meetings managed by someone in the hierarchy
            managerId: {
              in: managerUserIdsInHierarchy,
            },
          },
          { // Meetings involving an employee from an accessible team
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