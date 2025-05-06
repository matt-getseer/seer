import express from 'express';
import cors from 'cors';
import teamsRouter from './routes/teams';
import employeesRouter from './routes/employees';
import authRouter from './routes/auth';
import meetingsRouter from './routes/meetings';
import { userRouter as usersRouter } from './routes/users';

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.use('/api/teams', teamsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/users', usersRouter);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler] Caught:', err.message);
  console.error(err.stack);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'An unexpected error occurred.',
    }
  });
});

export default app; 