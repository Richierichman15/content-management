# Content Management System

A powerful and flexible headless CMS built with Node.js, Express, and MongoDB.

## Features

### Content Management
- **Content Creation & Editing**: Create and edit content with a rich text editor
- **Content Versioning**: Track changes with automatic version history
- **Content Scheduling**: Schedule content to be published or unpublished at specific dates
- **Content Templates**: Create reusable templates for consistent content structure
- **Categories & Tags**: Organize content with categories and tags
- **Search & Filter**: Find content quickly with advanced search and filtering

### Media Management
- **Media Library**: Upload, organize, and manage all media assets
- **AI-powered Analysis**: Automatically generate tags and descriptions for images
- **Image Variants**: Create and manage different sizes and versions of images
- **File Organization**: Organize files into folders for easy management
- **Image Optimization**: Automatically optimize images for web use

### User Management
- **Role-based Access Control**: Define user roles with specific permissions
- **User Authentication**: Secure login with JWT

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local storage or AWS S3
- **Image Processing**: Sharp
- **AI Integration**: OpenAI API for image analysis and content suggestions

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/content-management.git
   cd content-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env` file:
   ```
   # Application
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=7d

   # Database
   MONGODB_URI=mongodb://localhost:27017/content-management

   # Storage
   STORAGE_TYPE=local  # 'local' or 's3'
   UPLOAD_DIR=uploads
   BASE_URL=http://localhost:5000

   # AWS S3 (if using S3 storage)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your_bucket_name

   # OpenAI (for AI features)
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Create required directories:
   ```bash
   mkdir -p uploads
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`.

## API Documentation

### Content Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content` | Get all content items |
| GET | `/api/content/:id` | Get content by ID |
| POST | `/api/content` | Create new content |
| PUT | `/api/content/:id` | Update content |
| DELETE | `/api/content/:id` | Delete content |
| GET | `/api/content/:id/versions` | Get content versions |
| POST | `/api/content/:id/versions/:versionId/restore` | Restore content version |
| POST | `/api/content/:id/schedule` | Schedule content publication |
| GET | `/api/content/:id/schedule` | Get content schedule |
| DELETE | `/api/content/:id/schedule` | Delete content schedule |

### Media Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media` | Get all media items |
| GET | `/api/media/public` | Get public media items |
| GET | `/api/media/:id` | Get media by ID |
| POST | `/api/media/upload` | Upload a single file |
| POST | `/api/media/upload/multiple` | Upload multiple files |
| PUT | `/api/media/:id` | Update media metadata |
| DELETE | `/api/media/:id` | Delete media |
| POST | `/api/media/:id/analyze` | Analyze image with AI |
| POST | `/api/media/:id/variants` | Create image variant |
| DELETE | `/api/media/:id/variants/:variantName` | Delete image variant |
| GET | `/api/media/folders` | Get media folders |

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

## Running Tests

```bash
npm test
```

For running specific tests:

```bash
npm test -- --testPathPattern=content.controller
```

## Known Issues

1. Image optimization sometimes fails for very large images (>20MB)
2. Content scheduling requires the server to be running continuously
3. OpenAI API rate limits can affect image analysis functionality
4. No caching mechanism implemented yet for media files
5. File uploads are limited to 10MB per file

## Future Tasks

### Short-term
- [ ] Implement pagination for version history
- [ ] Add bulk operations for media files
- [ ] Implement server-side caching for media files
- [ ] Add webhook support for content events
- [ ] Improve error handling for S3 uploads

### Medium-term
- [ ] Add content workflow approval system
- [ ] Implement content previews
- [ ] Add support for additional storage providers (Google Cloud, Azure)
- [ ] Create a dashboard with content analytics
- [ ] Implement rate limiting for API endpoints

### Long-term
- [ ] Build a React/Vue frontend client
- [ ] Add support for additional media types (video, audio)
- [ ] Implement a plugin system for extensibility
- [ ] Add multi-language support for content
- [ ] Implement real-time collaboration features

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the image analysis API
- The entire open-source community for the amazing tools and libraries 