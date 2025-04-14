# Cut-Once Backend API Service

Secure backend service for the Cut-Once application, handling all sensitive operations and database interactions.

## Features

- Secure API endpoints with proper authentication
- Rate limiting and security headers
- Request validation
- Error handling and logging
- TypeScript support
- Supabase integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

3. Build the project:
```bash
npm run build
```

## Development

Start the development server:
```bash
npm run dev
```

## Production

Build and start the production server:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
All endpoints except `/api/health` require authentication via Bearer token.

### Available Endpoints

- `GET /api/health` - Health check
- `GET /api/surveys` - Get all surveys
- `GET /api/surveys/:id` - Get survey by ID
- `POST /api/surveys` - Create new survey
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey
- `GET /api/surveys/:id/questions` - Get survey questions
- `POST /api/surveys/:id/questions` - Add survey question
- `PUT /api/surveys/:id/questions/:questionId` - Update survey question
- `DELETE /api/surveys/:id/questions/:questionId` - Delete survey question
- `GET /api/surveys/:id/responses` - Get survey responses
- `POST /api/surveys/:id/responses` - Add survey response

## Security Features

- JWT authentication
- Rate limiting
- CORS protection
- Security headers (Helmet)
- Request validation
- Error handling
- Secure environment configuration
- SQL injection protection (via Supabase)

## Error Handling

The API uses a centralized error handling system. All errors are logged and return appropriate HTTP status codes and messages.

## Logging

Winston is used for logging. In development, logs are output to the console. In production, they are formatted as JSON. 