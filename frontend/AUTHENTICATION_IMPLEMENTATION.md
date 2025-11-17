# Frontend Authentication Implementation

## Overview

This document describes the frontend authentication system implementation for the Bunty ZKP Platform. The system provides JWT-based authentication with automatic token refresh, protected routes, and a complete user management interface.

## Architecture

### Components

1. **Authentication Context** (`src/contexts/AuthContext.tsx`)
   - Provides global authentication state
   - Manages user session
   - Handles automatic token refresh
   - Exposes authentication methods (login, register, logout)

2. **API Client** (`src/lib/api.ts`)
   - Axios-based HTTP client
   - Automatic JWT token injection
   - Token refresh interceptor
   - Handles 401 responses automatically

3. **Auth Service** (`src/services/auth.service.ts`)
   - Encapsulates authentication API calls
   - Manages token storage in localStorage
   - Provides user session management

4. **Protected Route Component** (`src/components/ProtectedRoute.tsx`)
   - Wrapper component for authenticated routes
   - Redirects to login if not authenticated
   - Shows loading state during authentication check

5. **Dashboard Layout** (`src/components/DashboardLayout.tsx`)
   - Consistent layout for authenticated pages
   - Navigation sidebar
   - User profile header with logout

## Features Implemented

### ✅ User Registration
- Form validation (email format, password length, password confirmation)
- Error handling and display
- Automatic redirect to dashboard on success
- Located at `/register`

### ✅ User Login
- Email and password authentication
- JWT token storage
- Error handling
- Automatic redirect to dashboard on success
- Located at `/login`

### ✅ Automatic Token Refresh
- Tokens refresh every 50 minutes (expire in 60 minutes)
- Automatic retry on 401 responses
- Seamless user experience without re-login

### ✅ Protected Routes
- Dashboard and all sub-routes require authentication
- Automatic redirect to login for unauthenticated users
- Loading state during authentication check

### ✅ User Dashboard
- Overview page with feature cards
- Navigation to:
  - Linked Accounts (placeholder for Plaid integration)
  - Identity Verification (placeholder for Stripe integration)
  - My Proofs (placeholder for proof management)
- User profile display
- Logout functionality

### ✅ Landing Page
- Public homepage with feature highlights
- Call-to-action buttons for registration and login
- Automatic redirect to dashboard for authenticated users

## File Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                    # Root layout with AuthProvider
│   ├── page.tsx                      # Landing page
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── register/
│   │   └── page.tsx                  # Registration page
│   └── dashboard/
│       ├── page.tsx                  # Dashboard overview
│       ├── accounts/
│       │   └── page.tsx              # Linked accounts (placeholder)
│       ├── verification/
│       │   └── page.tsx              # Identity verification (placeholder)
│       └── proofs/
│           └── page.tsx              # Proof management (placeholder)
├── components/
│   ├── ProtectedRoute.tsx            # Protected route wrapper
│   └── DashboardLayout.tsx           # Dashboard layout with navigation
├── contexts/
│   └── AuthContext.tsx               # Authentication context
├── services/
│   └── auth.service.ts               # Authentication service
├── lib/
│   └── api.ts                        # API client with interceptors
└── types/
    └── auth.types.ts                 # TypeScript types for auth

```

## API Integration

The frontend expects the following backend endpoints:

### Authentication Endpoints

```typescript
POST /api/auth/register
Body: { email: string, password: string }
Response: { user: User, accessToken: string, refreshToken: string, expiresIn: number }

POST /api/auth/login
Body: { email: string, password: string }
Response: { user: User, accessToken: string, refreshToken: string, expiresIn: number }

POST /api/auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string, refreshToken: string, expiresIn: number }

POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { success: boolean }

GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user: User }
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Usage

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

### User Flow

1. **New User Registration**
   - Visit `/register`
   - Enter email and password
   - Automatically logged in and redirected to dashboard

2. **Existing User Login**
   - Visit `/login`
   - Enter credentials
   - Redirected to dashboard on success

3. **Authenticated Session**
   - Access dashboard and protected routes
   - Token automatically refreshes every 50 minutes
   - Logout from user menu

4. **Session Expiry**
   - If token refresh fails, user is redirected to login
   - User must re-authenticate

## Security Features

### Token Management
- Access tokens stored in localStorage
- Refresh tokens used for automatic renewal
- Tokens cleared on logout
- Automatic cleanup on authentication failure

### Protected Routes
- All dashboard routes require authentication
- Unauthenticated users redirected to login
- Authentication state checked on mount

### Form Validation
- Email format validation
- Password length requirements (minimum 8 characters)
- Password confirmation matching
- Client-side validation before API calls

### API Security
- JWT tokens sent in Authorization header
- Automatic token refresh on 401 responses
- HTTPS recommended for production

## Next Steps

The following features are placeholders and will be implemented in subsequent tasks:

1. **Plaid Integration** (Task 11)
   - Bank account linking
   - Financial data fetching
   - Account display in `/dashboard/accounts`

2. **Stripe Identity Integration** (Task 12)
   - KYC verification modal
   - Verification status display
   - Integration in `/dashboard/verification`

3. **Proof Generation** (Task 14)
   - Witness construction
   - Local proof generation
   - Proof display in `/dashboard/proofs`

4. **Wallet Integration** (Task 15)
   - Lace Wallet connection
   - Transaction signing
   - Proof submission

## Testing

To test the authentication system:

1. Start the backend server (ensure it's running on port 3001)
2. Start the frontend development server
3. Test registration flow:
   - Navigate to `/register`
   - Create a new account
   - Verify redirect to dashboard
4. Test login flow:
   - Logout from dashboard
   - Navigate to `/login`
   - Login with credentials
   - Verify redirect to dashboard
5. Test protected routes:
   - Logout
   - Try to access `/dashboard` directly
   - Verify redirect to login
6. Test token refresh:
   - Login and wait (or manually expire token)
   - Verify automatic refresh works

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 1.1**: JWT-based authentication with refresh token capability ✅
- **Requirement 12.2**: User dashboard showing account status ✅

## TypeScript Types

All components are fully typed with TypeScript for type safety:

```typescript
interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

## Troubleshooting

### "Network Error" on Login/Register
- Ensure backend is running on port 3001
- Check NEXT_PUBLIC_API_URL environment variable
- Verify CORS is configured on backend

### Infinite Redirect Loop
- Clear localStorage
- Check token expiration logic
- Verify backend /auth/me endpoint works

### Token Refresh Not Working
- Check refresh token endpoint on backend
- Verify refresh interval (50 minutes)
- Check browser console for errors

## Conclusion

The frontend authentication system is now fully implemented with:
- Complete user registration and login flows
- Automatic token refresh
- Protected route handling
- User dashboard with navigation
- Type-safe TypeScript implementation

The system is ready for integration with Plaid, Stripe, and proof generation features in subsequent tasks.
