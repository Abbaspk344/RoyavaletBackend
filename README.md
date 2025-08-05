# Royavalet Backend API

This is the standalone backend API for the Royavalet Parking Services admin system.

## Features

- User authentication (login/signup)
- JWT token-based authentication
- Password hashing with bcrypt
- MongoDB integration
- Express.js REST API
- Input validation
- Security middleware (helmet, CORS, rate limiting)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd royavaletBackend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - The `.env` file is already configured
   - Make sure to change the JWT_SECRET in production
   - Update MONGODB_URI if using a different MongoDB setup

4. Start MongoDB:
   - If using local MongoDB: `mongod`
   - If using MongoDB Atlas: Update the MONGODB_URI in .env

5. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:5000

## Project Structure

```
royavaletBackend/
├── models/
│   └── User.js              # User model with password hashing
├── routes/
│   └── auth.js              # Authentication routes
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── .env                     # Environment variables
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## API Endpoints

### Authentication Routes

#### POST /api/auth/signup
Create a new admin user.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer jwt_token_here
```

#### GET /api/auth/dashboard
Get dashboard data (requires admin authentication).

**Headers:**
```
Authorization: Bearer jwt_token_here
```

#### POST /api/auth/logout
Logout user (client-side token removal).

### Health Check

#### GET /api/health
Check if the API is running.

## Testing with Postman

1. **Health Check**: GET http://localhost:5000/api/health

2. **Create Admin User**: POST http://localhost:5000/api/auth/signup
   - Body: JSON with email, password, confirmPassword

3. **Login**: POST http://localhost:5000/api/auth/login
   - Body: JSON with email, password
   - Save the token from response

4. **Access Dashboard**: GET http://localhost:5000/api/auth/dashboard
   - Headers: Authorization: Bearer {token}

## Frontend Integration

The frontend (royavalet) should make API calls to:
- Base URL: `http://localhost:5000`
- All endpoints are prefixed with `/api`

Example frontend API call:
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
```

## Security Features

- Password hashing with bcrypt (cost factor: 12)
- JWT token authentication
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Helmet security headers
- Input validation with express-validator

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: Token expiration time (default: 7d)
- `MONGODB_URI`: MongoDB connection string
- `CORS_ORIGIN`: Allowed CORS origin (default: http://localhost:5173)

## Development

The server uses nodemon for development, which automatically restarts when files change.

```bash
npm run dev
```

## Production Deployment

1. Set NODE_ENV=production
2. Use a strong JWT_SECRET
3. Configure proper MongoDB connection
4. Set up proper CORS origins
5. Consider using PM2 for process management

## Separate from Frontend

This backend runs independently from the frontend project. The frontend (royavalet) and backend (royavaletBackend) are now separate projects that can be developed and deployed independently.
