const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

/**
 * Storage service for handling media file uploads
 */
class StorageService {
  constructor() {
    this.storageType = config.storage.type;
    
    // Initialize S3 if needed
    if (this.storageType === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region
      });
      this.bucket = config.storage.s3.bucket;
    }
    
    // Create upload directory if it doesn't exist
    this.uploadDir = path.join(process.cwd(), config.storage.local.uploadDir);
    this.createUploadDirIfNotExists();
  }
  
  /**
   * Create upload directory if it doesn't exist
   */
  async createUploadDirIfNotExists() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      console.log(`Creating upload directory: ${this.uploadDir}`);
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }
  
  /**
   * Upload file to storage (local or S3)
   * @param {string} filePath - Path to the temporary file
   * @param {string} fileName - Name of the file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<Object>} Upload result with key and url
   */
  async uploadToS3(filePath, fileName, mimeType) {
    // Check if we're using S3
    if (this.storageType !== 's3') {
      // For local storage, just return the file info
      return {
        key: filePath,
        url: `/${config.storage.local.uploadDir}/${fileName}`
      };
    }
    
    // Generate a unique file key using UUID
    const fileExt = path.extname(fileName);
    const fileKey = `uploads/${uuidv4()}${fileExt}`;
    
    // Read file
    const fileContent = await fs.readFile(filePath);
    
    // Upload to S3
    const params = {
      Bucket: this.bucket,
      Key: fileKey,
      Body: fileContent,
      ContentType: mimeType,
      ACL: 'public-read'
    };
    
    const result = await this.s3.upload(params).promise();
    
    // Delete local temp file
    await fs.unlink(filePath);
    
    return {
      key: fileKey,
      url: result.Location
    };
  }
  
  /**
   * Delete file from storage (local or S3)
   * @param {string} fileKey - Key or path of the file
   * @returns {Promise<boolean>} Success status
   */
  async deleteFromS3(fileKey) {
    // Check if we're using S3
    if (this.storageType !== 's3') {
      // For local storage, delete the local file
      try {
        await fs.unlink(fileKey);
        return true;
      } catch (error) {
        console.error(`Error deleting local file: ${fileKey}`, error);
        return false;
      }
    }
    
    // Delete from S3
    const params = {
      Bucket: this.bucket,
      Key: fileKey
    };
    
    try {
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error(`Error deleting file from S3: ${fileKey}`, error);
      return false;
    }
  }
  
  /**
   * Get signed URL for a file (for private files)
   * @param {string} fileKey - Key of the file in storage
   * @param {number} expiry - Expiry time in seconds
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(fileKey, expiry = 3600) {
    if (this.storageType !== 's3') {
      // For local storage, just return the file path
      return `${config.storage.local.baseUrl}/${config.storage.local.uploadDir}/${path.basename(fileKey)}`;
    }
    
    // Generate signed URL for S3
    const params = {
      Bucket: this.bucket,
      Key: fileKey,
      Expires: expiry
    };
    
    return this.s3.getSignedUrlPromise('getObject', params);
  }
}

// Create singleton instance
const storageService = new StorageService();

// Export the service methods
module.exports = {
  uploadToS3: storageService.uploadToS3.bind(storageService),
  deleteFromS3: storageService.deleteFromS3.bind(storageService),
  getSignedUrl: storageService.getSignedUrl.bind(storageService)
};

/**
 * Optimize an image using sharp
 * @param {string} filePath - Path to the image file
 * @param {Object} options - Optimization options
 * @returns {Promise<{path: string, size: number}>} - Path and size of optimized image
 */
exports.optimizeImage = async (filePath, options = {}) => {
  const {
    quality = 80,
    format = 'auto',
    width,
    height
  } = options;
  
  // Create sharp instance
  let image = sharp(filePath);
  
  // Resize if dimensions are provided
  if (width || height) {
    image = image.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  
  // Determine output format
  let outputFormat = format;
  if (format === 'auto') {
    // Use input format or convert to WebP for better compression
    const metadata = await image.metadata();
    outputFormat = metadata.format === 'jpeg' || metadata.format === 'png' ? 'webp' : metadata.format;
  }
  
  // Apply format-specific options
  switch (outputFormat) {
    case 'jpeg':
      image = image.jpeg({ quality });
      break;
    case 'png':
      image = image.png({ quality });
      break;
    case 'webp':
      image = image.webp({ quality });
      break;
    default:
      // Keep original format
      break;
  }
  
  // Generate output path
  const extname = path.extname(filePath);
  const basename = path.basename(filePath, extname);
  const outputPath = path.join(
    path.dirname(filePath),
    `${basename}_optimized.${outputFormat}`
  );
  
  // Save optimized image
  await image.toFile(outputPath);
  
  // Get file stats
  const stats = await fs.stat(outputPath);
  
  return {
    path: outputPath,
    size: stats.size
  };
};

/**
 * Extract EXIF data from an image
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - EXIF metadata
 */
exports.extractExifData = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // Extract relevant EXIF data
    const exif = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      hasProfile: metadata.hasProfile,
      orientation: metadata.orientation
    };
    
    // Include raw EXIF if available
    if (metadata.exif) {
      try {
        // Parse EXIF data if available
        exif.raw = metadata.exif.toString('binary');
      } catch (error) {
        console.error('Error parsing EXIF data:', error);
      }
    }
    
    return exif;
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return {};
  }
}; 