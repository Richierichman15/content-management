require('dotenv').config();

const config = {
  // Application settings
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpire: process.env.JWT_EXPIRE || '7d'
  },
  
  // Database settings
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/content-management',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Storage settings
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET
    },
    local: {
      uploadDir: process.env.UPLOAD_DIR || 'uploads',
      baseUrl: process.env.BASE_URL || 'http://localhost:5000'
    }
  },
  
  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo',
    visionModel: process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '800')
  },
  
  // Email settings
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY
    },
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },
  
  // Security settings
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      optionsSuccessStatus: 200
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100')
    }
  }
};

module.exports = config; 