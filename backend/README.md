# CloudDrive Backend

A robust Deno backend for the CloudDrive file storage application, built with Appwrite as the backend-as-a-service provider.

## Features

- **Authentication**: User registration, login, logout, password reset
- **File Management**: Upload, download, delete, rename files with secure storage
- **Folder Management**: Create, delete, rename folders with hierarchical structure
- **Search**: Full-text search across files and folders with advanced filtering
- **Sharing**: Secure file and folder sharing with expiration and permissions
- **Activity Logging**: Track all user actions for audit and analytics
- **Real-time Updates**: WebSocket support for live updates (planned)
- **Security**: JWT-based authentication, role-based permissions, input validation

## Architecture

```
backend/
├── main.ts                 # Application entry point
├── types/                  # TypeScript type definitions
├── middleware/             # Authentication and error handling
├── routes/                 # API route handlers
│   ├── auth.ts            # Authentication endpoints
│   ├── files.ts           # File management endpoints
│   ├── folders.ts         # Folder management endpoints
│   ├── search.ts          # Search endpoints
│   └── sharing.ts         # Sharing endpoints
├── utils/                  # Utility functions
│   ├── logger.ts          # Logging utilities
│   ├── crypto.ts          # Cryptographic functions
│   └── activity.ts        # Activity logging
└── scripts/               # Setup and maintenance scripts
    └── setup-database.ts  # Database initialization
```

## Prerequisites

1. **Deno**: Install Deno runtime
2. **Appwrite**: Set up an Appwrite instance (cloud or self-hosted)
3. **Environment Variables**: Configure your environment

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update the `.env` file with your Appwrite configuration:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=clouddrive
APPWRITE_STORAGE_BUCKET_ID=files
FRONTEND_URL=http://localhost:4321
PORT=8000
LOG_LEVEL=info
JWT_SECRET=your_jwt_secret_key
```

### 2. Appwrite Setup

1. Create a new Appwrite project
2. Generate an API key with the following scopes:
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `attributes.read`
   - `attributes.write`
   - `documents.read`
   - `documents.write`
   - `files.read`
   - `files.write`
   - `users.read`
   - `users.write`

### 3. Database Initialization

Run the database setup script to create collections and attributes:

```bash
deno run --allow-net --allow-env backend/scripts/setup-database.ts
```

This will create:
- Database with collections for files, folders, activities, and shares
- Storage bucket for file uploads
- Proper permissions and indexes

### 4. Start the Server

```bash
deno run --allow-net --allow-env backend/main.ts
```

The server will start on `http://localhost:8000` (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/password-reset` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm password reset

### Files
- `GET /api/files` - List files in folder
- `GET /api/files/:fileId` - Get file details
- `POST /api/files/upload` - Upload file
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file
- `PATCH /api/files/:fileId/rename` - Rename file
- `GET /api/files/:fileId/preview` - Get file preview

### Folders
- `GET /api/folders` - List folders
- `GET /api/folders/:folderId` - Get folder details
- `POST /api/folders` - Create folder
- `DELETE /api/folders/:folderId` - Delete folder
- `PATCH /api/folders/:folderId/rename` - Rename folder
- `GET /api/folders/:folderId/path` - Get folder breadcrumb path

### Search
- `GET /api/search?q=query` - Search files and folders
- `POST /api/search/advanced` - Advanced search with filters
- `GET /api/search/recent` - Get recent files

### Sharing
- `POST /api/sharing` - Create share link
- `GET /api/sharing/:token` - Access shared resource
- `GET /api/sharing` - List user's shares
- `DELETE /api/sharing/:shareId` - Delete share
- `PATCH /api/sharing/:shareId` - Update share permissions

## Security Features

### Authentication & Authorization
- JWT-based session management
- Role-based access control
- Resource ownership validation
- Secure password handling

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (planned)

### File Security
- Secure file uploads with type validation
- Virus scanning integration (planned)
- File size limits
- Access control for shared resources

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Logging

The application uses structured logging with configurable levels:
- `debug` - Detailed debugging information
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages

Configure logging level via `LOG_LEVEL` environment variable.

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Pagination for large result sets
- Query optimization for search operations

### File Handling
- Chunked uploads for large files
- Streaming downloads
- Thumbnail generation for images
- CDN integration (planned)

### Caching
- Response caching for static data
- Redis integration (planned)
- File metadata caching

## Deployment

### Deno Deploy
1. Connect your repository to Deno Deploy
2. Set environment variables in the dashboard
3. Deploy with automatic scaling

### Docker (Alternative)
```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app
COPY . .
RUN deno cache backend/main.ts

EXPOSE 8000
CMD ["run", "--allow-net", "--allow-env", "backend/main.ts"]
```

### Environment Variables for Production
- Set `LOG_LEVEL=warn` for production
- Use strong `JWT_SECRET`
- Configure proper CORS origins
- Set up monitoring and alerting

## Monitoring & Analytics

### Health Checks
- `GET /health` - Application health status
- Database connectivity checks
- Storage service availability

### Metrics (Planned)
- Request/response times
- Error rates
- File upload/download statistics
- User activity analytics

## Contributing

1. Follow Deno coding standards
2. Add tests for new features
3. Update documentation
4. Ensure security best practices

## License

MIT License - see LICENSE file for details.