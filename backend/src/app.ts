import express from 'express';
import cors from 'cors';
import teamsRouter from './routes/teams';
import employeesRouter from './routes/employees';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/teams', teamsRouter);
app.use('/api/employees', employeesRouter);

export default app; 