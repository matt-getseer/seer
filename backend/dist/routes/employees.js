"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const accessControlService_1 = require("../services/accessControlService");
const multer_1 = __importDefault(require("multer"));
const csv_parse_1 = require("csv-parse");
const stream_1 = require("stream");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get all employees for a team
const getTeamEmployees = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Create a new employee
const createEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Update an employee
const updateEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Delete an employee
const deleteEmployee = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
// Get an employee by id
const getEmployeeById = async (req, res, next) => {
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
        const accessibleEmployees = await (0, accessControlService_1.getAccessibleEmployees)(currentUser);
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
            }
            else {
                res.status(403).json({ error: 'Unauthorized to view this employee' });
            }
            return;
        }
        // 4. If found and accessible, return it.
        //    `targetEmployee` from `getAccessibleEmployees` should have the required structure.
        res.json(targetEmployee);
    }
    catch (error) {
        // Log the error for server-side inspection
        console.error(`Error in getEmployeeById for ID ${req.params.id}:`, error);
        next(error); // Pass to global error handler
    }
};
// Get all employees for the authenticated user
const getAllEmployees = async (req, res, next) => {
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
        const employees = await (0, accessControlService_1.getAccessibleEmployees)(currentUser);
        res.json(employees);
    }
    catch (error) {
        next(error);
    }
};
// Get meetings for a specific employee (filtered by the logged-in manager)
const getEmployeeMeetings = async (req, res, next) => {
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
            select: {
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
    }
    catch (error) {
        next(error);
    }
};
// Route handlers
router.get('/', auth_1.authenticate, auth_1.extractUserInfo, getAllEmployees);
router.get('/team/:teamId', auth_1.authenticate, auth_1.extractUserInfo, getTeamEmployees);
router.get('/:id', auth_1.authenticate, auth_1.extractUserInfo, getEmployeeById);
router.get('/:employeeId/meetings', auth_1.authenticate, auth_1.extractUserInfo, getEmployeeMeetings);
router.post('/', auth_1.authenticate, auth_1.extractUserInfo, createEmployee);
router.put('/:id', auth_1.authenticate, auth_1.extractUserInfo, updateEmployee);
router.delete('/:id', auth_1.authenticate, auth_1.extractUserInfo, deleteEmployee);
// Configure multer for CSV file uploads
const storage = multer_1.default.memoryStorage(); // Store file in memory
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(null, false); // Reject file
            // Optionally, pass an error to cb if you want to stop the request flow with an error
            // cb(new Error('Only .csv files are allowed!')); 
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});
// New endpoint for CSV upload
router.post('/upload-csv', auth_1.authenticate, auth_1.extractUserInfo, upload.single('file'), async (req, res, next) => {
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
    let userOrganizationId = null;
    try {
        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { organizationId: true },
        });
        if (!user || !user.organizationId) {
            return res.status(400).json({ message: 'User is not associated with an organization. Cannot import employees.' });
        }
        userOrganizationId = user.organizationId;
    }
    catch (error) {
        console.error("Failed to fetch user's organization ID:", error);
        return res.status(500).json({ message: "Failed to retrieve user's organization details." });
    }
    const fileBuffer = req.file.buffer;
    // Convert buffer to a readable stream for the parser
    const stream = stream_1.Readable.from(fileBuffer);
    const records = [];
    const errors = [];
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let rowNumber = 0; // For error reporting (1-indexed for CSV rows, excluding header)
    const parser = stream.pipe((0, csv_parse_1.parse)({
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
            const { employee_name, employee_title, employee_email, team_name, team_department, employee_start_date, employee_country, manager_email } = record; // Ensure type assertion is robust
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
            let validStartDate = undefined;
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
                }
                else {
                    validStartDate = parsedDate;
                }
            }
            let managerId = null; // Initialize managerId
            if (manager_email && typeof manager_email === 'string' && manager_email.trim() !== '') {
                try {
                    const manager = await prisma.employee.findUnique({
                        where: { email: manager_email.trim() },
                        select: { id: true }
                    });
                    if (manager) {
                        managerId = manager.id;
                    }
                    else {
                        console.warn(`CSV Upload: Manager with email "${manager_email.trim()}" not found for employee "${employee_email}". Employee will be created/updated without a manager.`);
                    }
                }
                catch (lookupError) {
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
                }
                else {
                    createdCount++;
                }
            }
            catch (dbError) {
                let errorMessage = 'Database error while processing row.';
                if (dbError instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (dbError.code === 'P2002') { // Unique constraint violation
                        // Example: Unique constraint failed on the fields: (`email`)
                        const target = dbError.meta?.target;
                        if (target && target.includes('email')) {
                            errorMessage = `Employee with email '${employee_email}' already exists.`;
                        }
                        else {
                            errorMessage = `Database unique constraint violation: ${dbError.message}`;
                        }
                    }
                    else {
                        errorMessage = `Database error: ${dbError.message}`;
                    }
                }
                else if (dbError instanceof Error) {
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
    }
    catch (error) {
        console.error('Error processing CSV file:', error);
        // if (error.message.includes('Only .csv files are allowed!')) { // This specific check might be redundant if multer handles it
        //     return res.status(400).json({ message: 'Invalid file type. Only .csv files are allowed.' });
        // }
        return res.status(500).json({ message: 'Failed to process CSV file.', error: error.message });
    }
});
exports.default = router;
