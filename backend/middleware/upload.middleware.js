const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to validate uploaded files
const fileFilter = (req, file, cb) => {
  // Accept images, videos, documents, etc.
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Others
    'text/plain', 'text/csv', 'application/json', 'application/zip'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Set up multer for single file upload
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('file');

// Set up multer for multiple file upload
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).array('files', 10); // Allow up to 10 files

// Middleware for handling single file upload with error handling
exports.uploadSingle = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (e.g., file too large)
      return res.status(400).json({
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      // Other error (e.g., file type not allowed)
      return res.status(400).json({
        message: err.message
      });
    }
    
    // No error, continue
    next();
  });
};

// Middleware for handling multiple file upload with error handling
exports.uploadMultiple = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error
      return res.status(400).json({
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      // Other error
      return res.status(400).json({
        message: err.message
      });
    }
    
    // No error, continue
    next();
  });
}; 