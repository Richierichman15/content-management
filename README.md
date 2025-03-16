# AI-Enhanced Content Management System

An intelligent content management system with AI-powered features for content creation, optimization, and management.

## Features

- **User Authentication**: Secure login and registration system
- **Content Management**: Create, update, and manage content with version control
- **AI Content Generation**: Generate content using OpenAI API
- **NLP Analysis**: Analyze readability, SEO optimization, and sentiment
- **Media Management**: Upload, store, and organize media files
- **Image Recognition**: Auto-tag and categorize images using AI
- **Content Optimization**: Get AI-powered suggestions to improve content
- **Analytics Dashboard**: Track content performance and user engagement

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Frontend**: React, TailwindCSS
- **AI Integration**: OpenAI API
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Docker

## Project Structure

```
content-management/
├── backend/                # Node.js Express backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   └── ai/                 # AI integration modules
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
└── docker/                 # Docker configuration
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB
- OpenAI API key

### Installation (Standard)

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/content-management.git
   cd content-management
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../frontend
   npm install
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/cms
   JWT_SECRET=your_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

5. Start the development servers:
   ```
   # In the backend directory
   npm run dev
   
   # In the frontend directory
   npm run dev
   ```

### Installation (Docker)

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/content-management.git
   cd content-management
   ```

2. Copy the example environment file and update with your API keys:
   ```
   cp .env.docker .env
   ```
   
   Edit the `.env` file to add your actual OpenAI API key and change the JWT secret.

3. Build and start the Docker containers:
   ```
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:5000

### Stopping the Docker containers

```
docker-compose down
```

### Rebuilding the Docker containers (after code changes)

```
docker-compose up -d --build
```

## Development

### Backend Development

To run the backend in development mode with hot reloading:

```
cd backend
npm run dev
```

### Frontend Development

To run the frontend in development mode with hot reloading:

```
cd frontend
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 