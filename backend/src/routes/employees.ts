import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Employee as PrismaEmployee, Prisma, Team, User } from '@prisma/client';
import { authenticate, extractUserInfo } from '../middleware/auth.js';
import { RequestWithUser } from '../middleware/types.js';
import { getAccessibleEmployees } from '../services/accessControlService.js';
import multer, { Multer } from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { withOrganizationFilter, getQueryOrganizationId } from '../utils/queryBuilder.js';
import { getOrganizationId } from '../config/featureFlags.js';

// Define a type for our CSV Row structure for better type safety
interface EmployeeCsvRow {
  employee_name: string;
  employee_title: string;
  employee_email: string;
  team_name: string;
  team_department: string;
  employee_start_date?: string; // Optional
  employee_country?: string;    // Optional
  manager_email?: string; // Optional: Email of the manager
}

// Typed prisma client
interface TypedPrismaClient extends PrismaClient {
  employee: any;
  team: any;
  interview: any;
}

// Define types for our models
interface Employee {
  id: number;
  name: string;
  title: string;
  email: string;
  teamId: number;
  userId: number;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  team?: {
    id: number;
    name: string;
    department: string;
  };
}

const router = express.Router();
const prisma = new PrismaClient() as TypedPrismaClient;

// Get all employees for a team
const getTeamEmployees = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;

    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: {
        teamId: parseInt(teamId),
        userId: req.user.id
      }
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Create a new employee
const createEmployee = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.id || !req.user.role || !req.user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing role/organization information.' });
    }
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    // Authorization: Only ADMIN or MANAGER can create employees
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Forbidden: Only admins or managers can create employees.' });
    }

    // Validate input fields
    if (!name || !title || !email || teamId === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name, title, email, teamId.' });
    }
    if (typeof teamId !== 'number') {
        return res.status(400).json({ error: 'Invalid teamId format, must be a number.'});
    }

    // Validate teamId: Ensure team exists and belongs to the user's organization
    const team = await prisma.team.findFirst({
        where: {
            id: teamId,
            organizationId: currentUserOrganizationId,
        }
    });
    if (!team) {
        return res.status(404).json({ error: 'Team not found in your organization or invalid teamId.' });
    }
    
    // Check for existing employee with the same email in the organization
    const existingEmployee = await prisma.employee.findFirst({
        where: { 
            email: email,
            team: { // Check via team relationship
                organizationId: currentUserOrganizationId
            }
        }
    });
    if (existingEmployee) {
        return res.status(409).json({ error: `Employee with email '${email}' already exists in your organization.` });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        title,
        email,
        startDate: startDate ? new Date(startDate) : null, // Ensure startDate is Date or null
        teamId: teamId, // Use validated teamId
        userId: req.user.id // Employee record linked to user creating it
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Example: P2002 for unique constraint violation if email + org isn't handled above perfectly
        // or P2003 for foreign key constraint (e.g. teamId doesn't exist despite check)
        return res.status(400).json({ error: 'Database error while creating employee.', details: error.code });
    }
    next(error);
  }
};

// Update an employee
const updateEmployee = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      data: {
        name,
        title,
        email,
        startDate: startDate ? new Date(startDate) : undefined,
        teamId: teamId ? parseInt(teamId) : undefined
      }
    });

    if (employee.count === 0) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    const updatedEmployee = await prisma.employee.findFirst({
      where: {
        id: parseInt(id)
      }
    });

    res.json(updatedEmployee);
  } catch (error) {
    next(error);
  }
};

// Delete an employee
const deleteEmployee = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    });

    if (employee.count === 0) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Get a specific employee by ID
const getEmployeeById = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetEmployeeId = parseInt(req.params.id);

    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Get organization ID using utility that respects feature flags
    const organizationId = getQueryOrganizationId(req as RequestWithUser);
    
    // Find the employee with proper organization filter
    const employee = await prisma.employee.findFirst({
      where: withOrganizationFilter({
        id: targetEmployeeId,
        team: { // Organization filter is applied to the team
          userId: req.user.id
        }
      }, organizationId),
      include: {
        team: {
          include: {
            department: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        Employee: { // Manager
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found or not accessible' });
      return;
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
};

// Get all employees for the authenticated user
const getAllEmployees = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found for access control' });
      return;
    }

    // Fetch employees using the access control service
    const employees = await getAccessibleEmployees(currentUser);

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Get meetings for a specific employee (filtered by the logged-in manager)
const getEmployeeMeetings = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const managerId = req.user?.id;

    if (!managerId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!employeeId) {
       res.status(400).json({ error: 'Employee ID is required' });
       return;
    }

    // Get organization ID using utility that respects feature flags
    const organizationId = getQueryOrganizationId(req as RequestWithUser);

    // Verify the manager has access to this employee (optional but good practice)
    // Use the withOrganizationFilter utility to apply organization filtering
    const employeeCheck = await prisma.employee.findFirst({
      where: withOrganizationFilter({
        id: parseInt(employeeId),
        userId: managerId
      }, organizationId)
    });

    if (!employeeCheck) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    // Fetch meetings for this employee where the current user is the manager
    // Apply organization filtering for consistent security boundaries
    const meetings = await prisma.meeting.findMany({
      where: withOrganizationFilter({
        employeeId: parseInt(employeeId),
        managerId: managerId
      }, organizationId),
      select: { // Select only necessary fields for the list
        id: true,
        title: true,
        scheduledTime: true,
        status: true,
        platform: true,
      },
      orderBy: {
        scheduledTime: 'desc' // Show most recent first
      }
    });

    res.json(meetings);

  } catch (error) {
    next(error);
  }
};

// Route handlers
router.get('/', authenticate, extractUserInfo, getAllEmployees);
router.get('/team/:teamId', authenticate, extractUserInfo, getTeamEmployees as any);
router.get('/:id', authenticate, extractUserInfo, getEmployeeById);
router.get('/:employeeId/meetings', authenticate, extractUserInfo, getEmployeeMeetings);
router.post('/', authenticate, extractUserInfo, createEmployee);
router.put('/:id', authenticate, extractUserInfo, updateEmployee);
router.delete('/:id', authenticate, extractUserInfo, deleteEmployee);

// Configure multer for CSV file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload: Multer = multer({
  storage: storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(null, false); // Reject file
      // Optionally, pass an error to cb if you want to stop the request flow with an error
      // cb(new Error('Only .csv files are allowed!')); 
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Extend Express Request type to include `file` from multer
interface RequestWithFile extends RequestWithUser {
  file?: Express.Multer.File;
}

// New endpoint for CSV upload
router.post('/upload-csv', authenticate, extractUserInfo, upload.single('file'), async (req: RequestWithFile, res: Response, next: NextFunction) => {
  if (!req.file) {
    // This check is important. If fileFilter rejects, req.file might be undefined.
    // The error from fileFilter (if an Error object was passed to cb) would typically be handled by an Express error handler.
    // If cb(null, false) was used, req.file is undefined, and we send a 400.
    return res.status(400).json({ message: 'No CSV file uploaded or file type was not accepted. Only .csv files are allowed.' });
  }
  if (!req.user?.id) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  const currentUserId = req.user.id;

  // Fetch the user's organizationId
  let userOrganizationId: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { organizationId: true },
    });
    if (!user || !user.organizationId) {
      return res.status(400).json({ message: 'User is not associated with an organization. Cannot import employees.' });
    }
    userOrganizationId = user.organizationId;
  } catch (error) {
    console.error("Failed to fetch user's organization ID:", error);
    return res.status(500).json({ message: "Failed to retrieve user's organization details." });
  }

  const fileBuffer = req.file.buffer;

  // Convert buffer to a readable stream for the parser
  const stream = Readable.from(fileBuffer);

  const records: EmployeeCsvRow[] = [];
  const errors: { row: number; message: string; data: any }[] = [];
  let processedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let rowNumber = 0; // For error reporting (1-indexed for CSV rows, excluding header)

  const parser = stream.pipe(parse({
    columns: true, // Use the first row as column headers
    skip_empty_lines: true,
    trim: true,
    cast: (value, context) => {
      // Keep original values for now, specific casting done during processing
      // For employee_start_date, ensure it's treated as a string initially
      if (context.column === 'employee_start_date') {
        return value;
      }
      return value;
    }
  }));

  try {
    for await (const record of parser) {
      rowNumber++;
      processedCount++;

      const {
        employee_name,
        employee_title,
        employee_email,
        team_name,
        team_department,
        employee_start_date,
        employee_country,
        manager_email
      } = record as Partial<EmployeeCsvRow & { manager_email?: string }>; // Ensure type assertion is robust

      // Basic validation for required fields
      if (!employee_name || !employee_title || !employee_email || !team_name || !team_department) {
        errors.push({ row: rowNumber, message: 'Missing required fields (employee_name, employee_title, employee_email, team_name, team_department).', data: record });
        continue;
      }
      
      // Email validation (basic)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee_email)) {
        errors.push({ row: rowNumber, message: 'Invalid employee_email format.', data: record });
        continue;
      }

      // Start date validation (if provided) - User requested removal for performance
      let validStartDate: Date | undefined = undefined;
      if (employee_start_date) {
      //   console.log(`Validating employee_start_date: '${employee_start_date}' (Length: ${employee_start_date.length})`); // DEBUGGING LINE
      //   if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(employee_start_date)) {
      //        errors.push({ row: rowNumber, message: 'Invalid employee_start_date format. Expected YYYY-MM-DD.', data: record });
      //        continue;
      //   }
        const parsedDate = new Date(employee_start_date); // Still parse it
        if (isNaN(parsedDate.getTime())) {
          // errors.push({ row: rowNumber, message: 'Invalid employee_start_date value. Could not parse to a valid date.', data: record });
          // continue; 
          // Decide if unparsable date should be an error or silently become null/invalid
          console.warn(`Row ${rowNumber}: employee_start_date '${employee_start_date}' is invalid and will likely result in null/invalid date in DB.`);
          validStartDate = undefined; // Or handle as error if preferred
        } else {
          validStartDate = parsedDate;
        }
      }

      let managerId: number | null = null; // Initialize managerId

      if (manager_email && typeof manager_email === 'string' && manager_email.trim() !== '') {
        try {
          const manager = await prisma.employee.findUnique({
            where: { email: manager_email.trim() },
            select: { id: true }
          });
          if (manager) {
            managerId = manager.id;
          } else {
            console.warn(`CSV Upload: Manager with email "${manager_email.trim()}" not found for employee "${employee_email}". Employee will be created/updated without a manager.`);
          }
        } catch (lookupError) {
          console.error(`CSV Upload: Error looking up manager with email "${manager_email.trim()}":`, lookupError);
        }
      }

      try {
        // Find or create Team (ensure userOrganizationId is used here if teams are org-specific)
        let team = await prisma.team.findFirst({
          where: {
            name: team_name,
            // Assuming teams are scoped by user creating them or by organization
            userId: currentUserId, 
            organizationId: userOrganizationId, 
          },
        });

        if (!team) {
          team = await prisma.team.create({
            data: {
              name: team_name,
              department: team_department, 
              userId: currentUserId,
              organizationId: userOrganizationId,
            },
          });
        }

        // Check if employee already exists to differentiate create vs update for counts
        const existingEmployee = await prisma.employee.findUnique({
          where: { email: employee_email },
          select: { id: true } // Only need to know if it exists
        });

        // Upsert Employee: Create if email doesn't exist, update if it does.
        await prisma.employee.upsert({
          where: { email: employee_email }, 
          update: { 
            name: employee_name,
            title: employee_title,
            startDate: validStartDate,
            country: employee_country || null,
            teamId: team.id, 
            userId: currentUserId, 
            managerId: managerId, // Add managerId to update
          },
          create: { 
            name: employee_name,
            title: employee_title,
            email: employee_email,
            startDate: validStartDate,
            country: employee_country || null,
            teamId: team.id,
            userId: currentUserId,
            managerId: managerId, // Add managerId to create
          },
        });
        
        // Increment the appropriate counter
        if (existingEmployee) {
          updatedCount++;
        } else {
          createdCount++;
        }
      } catch (dbError: any) {
        let errorMessage = 'Database error while processing row.';
        if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
          if (dbError.code === 'P2002') { // Unique constraint violation
            // Example: Unique constraint failed on the fields: (`email`)
            const target = dbError.meta?.target as string[] | undefined;
            if (target && target.includes('email')) {
                 errorMessage = `Employee with email '${employee_email}' already exists.`;
            } else {
                 errorMessage = `Database unique constraint violation: ${dbError.message}`;
            }
          } else {
            errorMessage = `Database error: ${dbError.message}`;
          }
        } else if (dbError instanceof Error) {
          errorMessage = dbError.message;
        }
        errors.push({ row: rowNumber, message: errorMessage, data: record });
      }
    }

    if (processedCount === 0 && req.file.buffer.length > 0) {
        // This might happen if the CSV is empty after headers or headers are missing/malformed.
        return res.status(400).json({ 
            message: 'No valid data rows found in the CSV. Please ensure the CSV is not empty and has correct headers: employee_name, employee_title, employee_email, team_name, team_department, employee_start_date (optional, YYYY-MM-DD), employee_country (optional), manager_email (optional).',
            errors: [] 
        });
    }
    
    const finalSuccessCount = createdCount + updatedCount;
    let message = `CSV processing complete. Processed ${processedCount} rows. Created ${createdCount} new employees, updated ${updatedCount} existing employees.`;
    if (errors.length > 0) {
      message += ` ${errors.length} rows had errors.`;
    }

    return res.status(errors.length > 0 && finalSuccessCount === 0 ? 400 : 200).json({
      message,
      successCount: finalSuccessCount,
      createdCount,
      updatedCount,
      errorCount: errors.length,
      errors,
    });

  } catch (error: any) {
    console.error('Error processing CSV file:', error);
    // if (error.message.includes('Only .csv files are allowed!')) { // This specific check might be redundant if multer handles it
    //     return res.status(400).json({ message: 'Invalid file type. Only .csv files are allowed.' });
    // }
    return res.status(500).json({ message: 'Failed to process CSV file.', error: error.message });
  }
});

// Bulk upload employees from CSV
const bulkUploadEmployees = async (req: RequestWithFile, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    if (!req.user?.id || !req.user.role || !req.user.organizationId) {
      return res.status(401).json({ error: 'User not authenticated or missing role/organization information.' });
    }
    const currentUserRole = req.user.role;
    const currentUserOrganizationId = req.user.organizationId;

    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER') {
      return res.status(403).json({ error: 'Forbidden: Only admins or managers can bulk upload employees.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded.' });
    }
    if (req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ message: 'Invalid file type. Only .csv files are allowed.' });
    }

    const employeesToCreate: Prisma.EmployeeCreateManyInput[] = [];
    const errors: string[] = [];
    let rowCount = 0;

    const readable = Readable.from(req.file.buffer.toString('utf8'));
    const parser = readable.pipe(parse({ 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
            if (context.column === 'employee_start_date') {
                if (value === '' || value === null) return undefined; // Handle empty string as undefined
                const date = new Date(value);
                return isNaN(date.getTime()) ? undefined : date; // Return undefined if date is invalid
            }
            return value;
        }
    }));

    for await (const row of parser) {
      rowCount++;
      const csvRow = row as EmployeeCsvRow;

      if (!csvRow.employee_name || !csvRow.employee_title || !csvRow.employee_email || !csvRow.team_name || !csvRow.team_department) {
        errors.push(`Row ${rowCount}: Missing required fields (name, title, email, team_name, team_department).`);
        continue;
      }

      try {
        // Find or create department
        let department = await prisma.department.findFirst({
          where: { name: csvRow.team_department, organizationId: currentUserOrganizationId }, // Use current user's orgId
        });
        if (!department) {
          department = await prisma.department.create({
            data: { name: csvRow.team_department, organizationId: currentUserOrganizationId }, // Use current user's orgId
          });
        }

        // Find or create team, linking to the found/created department and current user's org
        let team = await prisma.team.findFirst({
          where: { name: csvRow.team_name, departmentId: department.id, organizationId: currentUserOrganizationId }, // Use current user's orgId
        });
        if (!team) {
          team = await prisma.team.create({
            data: {
              name: csvRow.team_name,
              departmentId: department.id,
              organizationId: currentUserOrganizationId, // Use current user's orgId
              // userId: currentUserId, // Assign current uploader as manager of this new team by default? Or null?
                                   // For bulk upload, perhaps new teams don't get a manager immediately or get a default system one.
                                   // Current logic in other parts of teams.ts might assign a manager differently.
                                   // For now, let it be null unless a specific manager_email is handled.
            },
          });
        }
        
        // Manager assignment based on manager_email (Optional)
        let managerUserIdForTeam: number | null = team.userId; // Default to existing team manager if any
        if (csvRow.manager_email) {
            const managerUser = await prisma.user.findUnique({ where: { email: csvRow.manager_email }});
            if (managerUser && managerUser.organizationId === currentUserOrganizationId && managerUser.role === 'MANAGER') {
                 // If manager is found, from same org, and is a MANAGER, assign this manager to the team if team doesn't have one
                 // Or, if product logic dictates, overwrite team manager if one is specified in CSV
                 // For now, let's assume we only set if team.userId is null OR if overwriting is desired policy.
                 // Let's say we will update the team's manager if one is provided in CSV
                 if (team.userId !== managerUser.id) {
                    await prisma.team.update({ where: { id: team.id }, data: { userId: managerUser.id }});
                    managerUserIdForTeam = managerUser.id;
                 } else {
                    managerUserIdForTeam = team.userId; // Keep existing if same or no change needed
                 }
            } else if (managerUser) {
                errors.push(`Row ${rowCount}: Manager email '${csvRow.manager_email}' found, but user is not a MANAGER or not in your organization.`);
            } else {
                errors.push(`Row ${rowCount}: Manager email '${csvRow.manager_email}' not found.`);
            }
        }

        // Prepare employee data
        const employeeData: Prisma.EmployeeCreateManyInput = {
          name: csvRow.employee_name,
          title: csvRow.employee_title,
          email: csvRow.employee_email,
          teamId: team.id,
          userId: req.user.id, // The user performing the upload becomes the Employee.userId (owner/creator)
          // organizationId: currentUserOrganizationId, // REMOVED - Employee linked to Org via Team
          startDate: csvRow.employee_start_date ? new Date(csvRow.employee_start_date) : null,
          country: csvRow.employee_country,
        };

        // Check for existing employee by email in the same organization (via team)
        const existingEmployee = await prisma.employee.findFirst({
            where: { 
                email: csvRow.employee_email, 
                team: { 
                    organizationId: currentUserOrganizationId 
                }
            }
        });

        if (existingEmployee) {
            errors.push(`Row ${rowCount}: Employee with email '${csvRow.employee_email}' already exists in your organization.`);
            continue;
        }

        employeesToCreate.push(employeeData);
      } catch (dbError: any) {
        errors.push(`Row ${rowCount}: Error processing - ${dbError.message}`);
      }
    }

    if (errors.length > 0 && employeesToCreate.length === 0) {
      return res.status(400).json({ message: 'CSV processing failed. See errors.', errors, createdCount: 0 });
    }
    
    let createdCount = 0;
    if (employeesToCreate.length > 0) {
        const result = await prisma.employee.createMany({
            data: employeesToCreate,
            skipDuplicates: true, // Should not be needed due to manual check, but as a safeguard
        });
        createdCount = result.count;
    }

    if (errors.length > 0) {
        return res.status(207).json({ 
            message: 'CSV processed with some errors.', 
            errors, 
            createdCount 
        });
    }

    res.status(201).json({ message: 'Employees uploaded successfully.', createdCount });

  } catch (error: any) {
    console.error('Error during bulk employee upload:', error);
    next(error);
  }
};

// Get all selectable employees (e.g., for a dropdown filter)
// Basic version: accessible employees based on the user's role
const getSelectableEmployees = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const userMakingRequest = await prisma.user.findUnique({
            where: { id: req.user.id },
            // select: { role: true, organizationId: true } // Already on req.user
        });

        if (!userMakingRequest) {
            return res.status(404).json({ error: 'Authenticated user not found in database.' });
        }

        const employees = await getAccessibleEmployees(userMakingRequest as User); 

        const selectableEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            email: emp.email,
            title: emp.title
        }));

        res.json(selectableEmployees);

    } catch (error) {
        console.error('Error fetching selectable employees:', error);
        next(error); // Pass to global error handler
    }
};

export default router; 