import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Employee as PrismaEmployee, Prisma, Team, User } from '@prisma/client';
import { authenticate, extractUserInfo, RequestWithUser } from '../middleware/auth';
import { getAccessibleEmployees } from '../services/accessControlService';
import multer, { Multer } from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

// Define a type for our CSV Row structure for better type safety
interface EmployeeCsvRow {
  employee_name: string;
  employee_title: string;
  employee_email: string;
  team_name: string;
  team_department: string;
  employee_start_date?: string; // Optional
  employee_country?: string;    // Optional
}

// Typed prisma client
interface TypedPrismaClient extends PrismaClient {
  employee: any;
  team: any;
  interview: any;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
  };
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
const getTeamEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamId } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employees = await prisma.employee.findMany({
      where: {
        teamId: parseInt(teamId),
        userId: req.user.userId
      }
    });

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

// Create a new employee
const createEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        title,
        email,
        startDate: new Date(startDate),
        teamId: parseInt(teamId),
        userId: req.user.userId
      }
    });

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

// Update an employee
const updateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, title, email, teamId, startDate } = req.body;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.updateMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
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
const deleteEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const employee = await prisma.employee.deleteMany({
      where: {
        id: parseInt(id),
        userId: req.user.userId
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

// Get an employee by id
const getEmployeeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetEmployeeId = parseInt(req.params.id);

    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // 1. Get the current user object (needed for accessControlService)
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!currentUser) {
      // This case should ideally not happen if authenticate middleware works
      res.status(401).json({ error: 'Authenticated user not found in database' });
      return;
    }

    // 2. Get all employees accessible to this user using the existing service function
    const accessibleEmployees = await getAccessibleEmployees(currentUser);

    // 3. Check if the targetEmployeeId is in the list of accessible employees
    //    The `getAccessibleEmployees` function already includes the necessary details like `team`.
    const targetEmployee = accessibleEmployees.find(emp => emp.id === targetEmployeeId);

    if (!targetEmployee) {
      // To provide a more specific error, we can check if the employee exists at all.
      const employeeExists = await prisma.employee.findUnique({
        where: { id: targetEmployeeId }
      });
      if (!employeeExists) {
        res.status(404).json({ error: 'Employee not found' });
      } else {
        res.status(403).json({ error: 'Unauthorized to view this employee' });
      }
      return;
    }

    // 4. If found and accessible, return it.
    //    `targetEmployee` from `getAccessibleEmployees` should have the required structure.
    res.json(targetEmployee);

  } catch (error) {
    // Log the error for server-side inspection
    console.error(`Error in getEmployeeById for ID ${req.params.id}:`, error);
    next(error); // Pass to global error handler
  }
};

// Get all employees for the authenticated user
const getAllEmployees = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId }
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
const getEmployeeMeetings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const managerId = req.user?.userId;

    if (!managerId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!employeeId) {
       res.status(400).json({ error: 'Employee ID is required' });
       return;
    }

    // Verify the manager has access to this employee (optional but good practice)
    const employeeCheck = await prisma.employee.findFirst({
      where: {
        id: parseInt(employeeId),
        userId: managerId
      }
    });

    if (!employeeCheck) {
      res.status(404).json({ error: 'Employee not found or unauthorized' });
      return;
    }

    // Fetch meetings for this employee where the current user is the manager
    const meetings = await prisma.meeting.findMany({
      where: {
        employeeId: parseInt(employeeId),
        managerId: managerId
      },
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
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  const currentUserId = req.user.userId;

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
        employee_country
      } = record as Partial<EmployeeCsvRow>; // Cast to partial to handle potentially missing optional fields

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
            teamId: team.id, // Update team association
            userId: currentUserId, // Should generally not change for an existing employee if already set
                                 // but needs to be consistent for the operation to be allowed by Prisma policies/relations.
          },
          create: { // Data to create if employee with this email does not exist
            name: employee_name,
            title: employee_title,
            email: employee_email,
            startDate: validStartDate,
            country: employee_country || null,
            teamId: team.id,
            userId: currentUserId,
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
            message: 'No valid data rows found in the CSV. Please ensure the CSV is not empty and has correct headers: employee_name, employee_title, employee_email, team_name, team_department, employee_start_date (optional, YYYY-MM-DD), employee_country (optional).',
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

export default router; 