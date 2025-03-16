const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Check if AWS credentials are configured
const isS3Configured = process.env.AWS_S3_BUCKET && 
                       process.env.AWS_ACCESS_KEY_ID && 
                       process.env.AWS_SECRET_ACCESS_KEY;

// Configure AWS SDK if credentials are available
let s3;
if (isS3Configured) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
  
  s3 = new AWS.S3();
}

/**
 * Upload a file to S3
 * @param {string} filePath - Local path to the file
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{key: string, url: string}>} - The S3 object key and URL
 */
exports.uploadToS3 = async (filePath, filename, mimeType) => {
  if (!isS3Configured) {
    throw new Error('AWS S3 is not configured');
  }
  
  // Read file from disk
  const fileContent = await fs.readFile(filePath);
  
  // Generate unique object key
  const key = `uploads/${uuidv4()}-${filename}`;
  
  // Set parameters for S3 upload
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: mimeType,
    ACL: 'public-read' // Make file publicly accessible
  };
  
  // Upload to S3
  const result = await s3.upload(params).promise();
  
  // Return S3 key and public URL
  return {
    key,
    url: result.Location
  };
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key or full URL
 * @returns {Promise<void>}
 */
exports.deleteFromS3 = async (key) => {
  if (!isS3Configured) {
    throw new Error('AWS S3 is not configured');
  }
  
  // If a full URL was provided, extract the key
  if (key.startsWith('http')) {
    const url = new URL(key);
    key = url.pathname.slice(1); // Remove leading slash
  }
  
  // Set parameters for S3 delete
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key
  };
  
  // Delete from S3
  await s3.deleteObject(params).promise();
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