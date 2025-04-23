# Task Manager Application

A full-stack task management application built with modern technologies.

## Tech Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL

## Project Structure

```
/
├── frontend/            # React frontend
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   ├── api/         # API client
│   │   └── ...          # Other files
│   ├── public/          # Static assets
│   └── ...              # Config files
└── backend/             # Express.js backend
    ├── src/             # Source code
    │   ├── routes/      # API routes
    │   ├── middleware/  # Express middleware
    │   └── ...          # Other files
    ├── prisma/          # Prisma schema and migrations
    └── ...              # Config files
```

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- PostgreSQL

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the environment variables by creating a `.env` file with:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/seer_db?schema=public"
   PORT=3001
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   ```

4. Run Prisma migrations:
   ```
   npm run prisma:migrate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with:
   ```
   VITE_API_URL=http://localhost:3001/api
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173`.

## Features

- User authentication (register, login, logout)
- Task management (create, read, update, delete)
- Responsive design with Tailwind CSS
- TypeScript for better type safety
- Secure API endpoints with JWT authentication
- PostgreSQL database with Prisma ORM 