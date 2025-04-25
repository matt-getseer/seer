# Migration to Clerk Authentication

This document describes the changes made to migrate from JWT-based authentication to Clerk.com authentication.

## Overview

We've migrated the authentication system from a custom JWT implementation to Clerk.com, a complete authentication and user management solution. This provides a more secure, feature-rich authentication system with less code to maintain.

## Changes Made

### Database

- Added `clerkId` field to the User model in Prisma schema
- Created migration to add this field to the database

### Frontend

1. **Installed Packages**
   - Added `@clerk/clerk-react` package

2. **Integration**
   - Added ClerkProvider in main.tsx
   - Created SignIn and SignUp components using Clerk components
   - Updated routing in App.tsx to use Clerk's authentication state
   - Modified protected route logic to use Clerk's `isSignedIn`
   - Replaced JWT token handling with Clerk token management
   - Updated Navbar to use Clerk's UserButton

3. **API Client**
   - Updated API client to get authentication tokens from Clerk
   - Removed JWT token validation and storage in localStorage

### Backend

1. **Installed Packages**
   - Added `@clerk/clerk-sdk-node` package

2. **Integration**
   - Created new authentication middleware using Clerk
   - Added utility to find or create users based on Clerk IDs
   - Updated routes to use Clerk authentication middleware
   - Modified route handlers to work with Clerk user IDs

## Environment Configuration

### Frontend

```
# API URL
VITE_API_URL=http://localhost:3001/api

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

### Backend

```
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/seer_db?schema=public"

# Server
PORT=3001

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY
```

## Remaining Tasks

1. **User Migration**
   - Existing users need to sign up with Clerk
   - Their accounts will be linked with existing data via email address

2. **Testing**
   - Test all authentication flows
   - Verify protected routes work correctly
   - Check API authentication is functioning

3. **Cleanup**
   - Remove old JWT code
   - Update documentation

## Benefits

- More secure authentication with OAuth providers
- Email verification built-in
- Multi-factor authentication
- User profile management
- Session management
- Less code to maintain 