import { PrismaClient, User, Team, Employee, Meeting, UserRole, Department, Prisma } from '@prisma/client';

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
    if (!currentUser.organizationId) return []; // Admin must belong to an org
    return prisma.team.findMany({
      where: { organizationId: currentUser.organizationId }, // Admins see all in their org
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
    if (!currentUser.organizationId) return []; // Manager must belong to an org

    // Logic for teams managed via hierarchy
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    let teamIdsFromHierarchy: number[] = [];
    if (managerUserIdsInHierarchy.length > 0) {
      const teamsManagedInHierarchy = await prisma.team.findMany({
        where: {
          userId: {
            in: managerUserIdsInHierarchy,
          },
          organizationId: currentUser.organizationId, // Ensure teams are within the same org
        },
        select: { id: true },
      });
      teamIdsFromHierarchy = teamsManagedInHierarchy.map(team => team.id);
    }

    // New logic for teams in departments headed by the current user
    let teamIdsFromHeadedDepartments: number[] = [];
    const headedDepartments = await prisma.department.findMany({
      where: {
        headId: currentUser.id,
        organizationId: currentUser.organizationId, // Ensure departments are within the same org
      },
      select: { id: true },
    });

    if (headedDepartments.length > 0) {
      const departmentIds = headedDepartments.map(dept => dept.id);
      const teamsInHeadedDepartments = await prisma.team.findMany({
        where: {
          departmentId: {
            in: departmentIds,
          },
          organizationId: currentUser.organizationId, // Ensure teams are within the same org
        },
        select: { id: true },
      });
      teamIdsFromHeadedDepartments = teamsInHeadedDepartments.map(team => team.id);
    }

    // Combine all unique team IDs
    const allAccessibleTeamIds = Array.from(new Set([...teamIdsFromHierarchy, ...teamIdsFromHeadedDepartments]));

    if (allAccessibleTeamIds.length === 0) {
      return [];
    }

    return prisma.team.findMany({
      where: {
        id: {
          in: allAccessibleTeamIds,
        },
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
            startDate: true,
            user: { select: { id: true, name: true, email: true, role: true }} // Added user details
          }
        },
        department: { // Include department info for context
            select: { id: true, name: true }
        },
        user: { // Include team manager info
            select: { id: true, name: true, email: true }
        }
      },
      orderBy: { name: 'asc' } // Optional: order teams by name
    });
  }

  if (currentUser.role === UserRole.USER) {
    if (!currentUser.organizationId) return []; // User must belong to an org
    // Find the employee record for the current user
    const employee = await prisma.employee.findFirst({
      where: { userId: currentUser.id, team: { organizationId: currentUser.organizationId } }, // User's team must be in their org
      select: { teamId: true }
    });

    if (employee && employee.teamId) {
      return prisma.team.findMany({
        where: { id: employee.teamId, organizationId: currentUser.organizationId } // Team must be in their org
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

export async function getAccessibleEmployees(currentUser: User): Promise<Employee[]> {
  if (currentUser.role === UserRole.ADMIN) {
    if (!currentUser.organizationId) return []; // Admin must belong to an org
    return prisma.employee.findMany({
      where: { user: { organizationId: currentUser.organizationId } }, // Employees must be in admin's org
      include: {
        user: true, // To get user details like role
        team: true,
        Employee: true, // Manager
        other_Employee: true, // Direct reports
      }
    });
  }

  if (currentUser.role === UserRole.MANAGER) {
    if (!currentUser.organizationId) return []; // Manager must belong to an org

    // Get all accessible team IDs using the updated getAccessibleTeams logic
    // To avoid re-fetching and re-calculating, we can't directly call getAccessibleTeams here
    // as it returns full Team objects. We need the IDs.

    // Logic for teams managed via hierarchy
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    let teamIdsFromHierarchy: number[] = [];
    if (managerUserIdsInHierarchy.length > 0) {
      const teamsManagedInHierarchy = await prisma.team.findMany({
        where: { userId: { in: managerUserIdsInHierarchy }, organizationId: currentUser.organizationId },
        select: { id: true },
      });
      teamIdsFromHierarchy = teamsManagedInHierarchy.map(team => team.id);
    }

    // New logic for teams in departments headed by the current user
    let teamIdsFromHeadedDepartments: number[] = [];
    const headedDepartments = await prisma.department.findMany({
      where: { headId: currentUser.id, organizationId: currentUser.organizationId },
      select: { id: true },
    });
    if (headedDepartments.length > 0) {
      const departmentIds = headedDepartments.map(dept => dept.id);
      const teamsInHeadedDepartments = await prisma.team.findMany({
        where: { departmentId: { in: departmentIds }, organizationId: currentUser.organizationId },
        select: { id: true },
      });
      teamIdsFromHeadedDepartments = teamsInHeadedDepartments.map(team => team.id);
    }
    
    const allAccessibleTeamIds = Array.from(new Set([...teamIdsFromHierarchy, ...teamIdsFromHeadedDepartments]));

    if (allAccessibleTeamIds.length === 0) {
      return [];
    }

    return prisma.employee.findMany({
      where: {
        teamId: {
          in: allAccessibleTeamIds,
        },
        // Ensure employees are within the same organization as the current user.
        // This check is implicitly handled if allAccessibleTeamIds are already org-filtered.
        // However, direct employee filtering might be needed if team-based filtering is not sufficient.
        // For now, relying on teams being correctly org-filtered.
         team: {
           organizationId: currentUser.organizationId
         }
      },
      include: {
        user: true,
        team: {
            include: {
                department: { select: { id: true, name: true}}
            }
        },
        Employee: { select: { id: true, name: true, email: true, user: { select: { id:true, name: true, email: true}}}}, // Manager
        other_Employee: { select: { id: true, name: true, email: true, user: { select: { id:true, name: true, email: true}}}} // Direct reports
      },
      orderBy: { name: 'asc'} // Optional: order employees
    });
  }

  if (currentUser.role === UserRole.USER) {
    if (!currentUser.organizationId) return []; // User must belong to an org
    const employee = await prisma.employee.findFirst({
      where: { userId: currentUser.id, team: { organizationId: currentUser.organizationId } }, // User's team must be in their org
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

export async function getAccessibleMeetings(currentUser: User): Promise<Meeting[]> {
  if (currentUser.role === UserRole.ADMIN) {
    if (!currentUser.organizationId) return []; // Admin must belong to an org
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
    if (!currentUser.organizationId) return []; // Manager must belong to an org

    // Manager User IDs from Hierarchy
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);

    // Department Headed Logic
    let departmentIdsHeadedByManager: number[] = [];
    const headedDepartments = await prisma.department.findMany({
        where: { headId: currentUser.id, organizationId: currentUser.organizationId },
        select: { id: true }
    });
    departmentIdsHeadedByManager = headedDepartments.map(d => d.id);

    // Collect all relevant User IDs (managers in hierarchy + current manager if they head depts)
    // and Employee IDs (from teams in hierarchy + teams in headed depts)

    let accessibleManagerUserIds = new Set<number>(managerUserIdsInHierarchy);
    if (departmentIdsHeadedByManager.length > 0) {
        accessibleManagerUserIds.add(currentUser.id); // Department head is a relevant manager
    }
    
    let accessibleEmployeeIds = new Set<number>();

    // Employees from teams in hierarchy
    if (managerUserIdsInHierarchy.length > 0) {
        const teamsInHierarchy = await prisma.team.findMany({
            where: { userId: { in: managerUserIdsInHierarchy }, organizationId: currentUser.organizationId },
            select: { id: true }
        });
        const teamIdsInHierarchy = teamsInHierarchy.map(t => t.id);
        if (teamIdsInHierarchy.length > 0) {
            const employeesInHierarchicalTeams = await prisma.employee.findMany({
                where: { teamId: { in: teamIdsInHierarchy } }, // team organizationId already filtered
                select: { id: true }
            });
            employeesInHierarchicalTeams.forEach(emp => accessibleEmployeeIds.add(emp.id));
        }
    }

    // Employees from teams in headed departments
    if (departmentIdsHeadedByManager.length > 0) {
        const teamsInHeadedDepts = await prisma.team.findMany({
            where: { departmentId: { in: departmentIdsHeadedByManager }, organizationId: currentUser.organizationId },
            select: { id: true }
        });
        const teamIdsInHeadedDepts = teamsInHeadedDepts.map(t => t.id);
        if (teamIdsInHeadedDepts.length > 0) {
            const employeesInDepartmentalTeams = await prisma.employee.findMany({
                where: { teamId: { in: teamIdsInHeadedDepts } }, // team organizationId already filtered
                select: { id: true }
            });
            employeesInDepartmentalTeams.forEach(emp => accessibleEmployeeIds.add(emp.id));
        }
    }
    
    const finalManagerUserIds = Array.from(accessibleManagerUserIds);
    const finalEmployeeIds = Array.from(accessibleEmployeeIds);

    if (finalManagerUserIds.length === 0 && finalEmployeeIds.length === 0) {
        return []; // No managers or employees to fetch meetings for
    }
    
    const meetingWhereClauses: Prisma.MeetingWhereInput[] = [];
    if (finalManagerUserIds.length > 0) {
        meetingWhereClauses.push({ managerId: { in: finalManagerUserIds } });
    }
    if (finalEmployeeIds.length > 0) {
        meetingWhereClauses.push({ employeeId: { in: finalEmployeeIds } });
    }
    
    return prisma.meeting.findMany({
      where: {
        OR: meetingWhereClauses,
        // Ensure meetings are implicitly within the user's organization
        // This relies on managers/employees being correctly org-scoped.
        // For meetings, manager (User) and employee (Employee -> User) should have orgId.
        // Let's add an explicit check for meeting's organization context if possible,
        // or ensure the users/employees involved are correctly scoped.
        // Assuming manager and employee relations implicitly handle organization scoping for now.
        // If Meeting model had an organizationId, that would be best.
        // For now, let's rely on the manager/employee being from the correct org.
         manager: { organizationId: currentUser.organizationId } // Filter by manager's org
      },
      include: {
        manager: true,
        employee: { include: { team: true, user: true } },
        insights: true,
        transcript: true,
      }
    });
  }

  if (currentUser.role === UserRole.USER) {
    if (!currentUser.organizationId) return []; // User must belong to an org
    // Find the employee ID for the current user
    const employee = await prisma.employee.findFirst({
      where: { userId: currentUser.id, team: { organizationId: currentUser.organizationId } }, // User's team must be in their org
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
          employee: { include: { team: true, user: { select: { id: true, name: true, email: true }} } },
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
        ],
        // Ensure these meetings are within the user's organization
        manager: { organizationId: currentUser.organizationId },
        employee: { team: { organizationId: currentUser.organizationId } }
      },
      include: {
        manager: { select: { id: true, name: true, email: true } }, // Basic info of manager
        employee: { 
          include: { 
            team: { select: { id:true, name: true }}, 
            user: { select: { id: true, name: true, email: true }}
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

// Helper function to get details of users (e.g., for populating createdBy/updatedBy or other user links)
// This is a NEW helper function you might need if you expand features. Not strictly for access control.
export async function getUserDetails(userIds: number[]): Promise<Pick<User, 'id' | 'name' | 'email' | 'role'>[]> {
  if (userIds.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      // Add other fields as necessary, e.g., profile picture URL
    }
  });
}

// Potentially a function to get accessible departments for a user
export async function getAccessibleDepartments(currentUser: User): Promise<Department[]> {
  if (!currentUser.organizationId) return []; // All roles need an org for this function

  if (currentUser.role === UserRole.ADMIN) {
    return prisma.department.findMany({
      where: { organizationId: currentUser.organizationId }, // Admins see all in their org
      include: {
        head: { select: { id: true, name: true, email: true } },
        teams: { select: { id: true, name: true } } // Basic team info
      },
      orderBy: { name: 'asc' }
    });
  }

  if (currentUser.role === UserRole.MANAGER) {
    // Managers see departments they head
    const headedDepartmentIds = (await prisma.department.findMany({
      where: { headId: currentUser.id, organizationId: currentUser.organizationId },
      select: { id: true }
    })).map(d => d.id);

    // And departments containing teams they manage via hierarchy
    const managerUserIdsInHierarchy = await getManagerialHierarchy(currentUser.id);
    let departmentIdsFromManagedTeams: number[] = [];
    if (managerUserIdsInHierarchy.length > 0) {
      const teamsManaged = await prisma.team.findMany({
        where: { userId: { in: managerUserIdsInHierarchy }, organizationId: currentUser.organizationId },
        select: { departmentId: true }
      });
      departmentIdsFromManagedTeams = teamsManaged.map(t => t.departmentId);
    }
    
    const allAccessibleDepartmentIds = Array.from(new Set([...headedDepartmentIds, ...departmentIdsFromManagedTeams]));

    if (allAccessibleDepartmentIds.length === 0) {
      return [];
    }
    return prisma.department.findMany({
      where: { id: { in: allAccessibleDepartmentIds }, organizationId: currentUser.organizationId },
      include: {
        head: { select: { id: true, name: true, email: true } },
        teams: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  if (currentUser.role === UserRole.USER) {
    // Users might see the department their team belongs to
    const employeeRecord = await prisma.employee.findFirst({
      where: { userId: currentUser.id, team: { organizationId: currentUser.organizationId } },
      select: { team: { select: { departmentId: true } } }
    });
    if (employeeRecord?.team?.departmentId) {
      return prisma.department.findMany({
        where: { id: employeeRecord.team.departmentId, organizationId: currentUser.organizationId },
        include: {
          head: { select: { id: true, name: true, email: true } },
          teams: { select: { id: true, name: true } } // Could filter to only user's team
        }
      });
    }
    return [];
  }
  return [];
} 