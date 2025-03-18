const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../app');
const Media = require('../../models/media.model');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const path = require('path');
const fs = require('fs').promises;
const mockFs = require('mock-fs');

let mongoServer;
let userToken;
let testUser;
let testMedia;

// Mock OpenAI service
jest.mock('../../services/openai.service', () => ({
  analyzeImage: jest.fn().mockResolvedValue({
    description: 'This is a test image description',
    accessibilityText: 'Test image alt text',
    tags: ['test', 'image', 'mock']
  })
}));

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create test user
  testUser = await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'password123',
    role: 'author'
  });

  // Generate token
  userToken = jwt.sign({ id: testUser._id }, config.app.jwtSecret, {
    expiresIn: '1h'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  mockFs.restore();
});

beforeEach(async () => {
  // Clear media collection
  await Media.deleteMany({});

  // Set up mock file system
  mockFs({
    'uploads': {
      'test-image.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // Mock JPEG file header
      'test-document.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]) // Mock PDF file header
    },
    'temp': {} // For uploaded files
  });

  // Create test media
  testMedia = await Media.create({
    filename: 'test-image.jpg',
    originalFilename: 'original-test-image.jpg',
    path: 'uploads/test-image.jpg',
    url: '/uploads/test-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    uploadedBy: testUser._id,
    title: 'Test Image',
    description: 'A test image',
    isPublic: true
  });
});

afterEach(() => {
  // Restore the real file system
  mockFs.restore();
  jest.clearAllMocks();
});

describe('Media Controller', () => {
  describe('getAllMedia', () => {
    test('should return user media with pagination', async () => {
      // Create multiple media items
      await Media.create([
        {
          filename: 'image1.jpg',
          originalFilename: 'image1.jpg',
          path: 'uploads/image1.jpg',
          url: '/uploads/image1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          uploadedBy: testUser._id,
          title: 'Image 1'
        },
        {
          filename: 'image2.jpg',
          originalFilename: 'image2.jpg',
          path: 'uploads/image2.jpg',
          url: '/uploads/image2.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          uploadedBy: testUser._id,
          title: 'Image 2'
        }
      ]);

      const response = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.media.length).toBe(3); // 2 new + 1 from beforeEach
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(3);
    });

    test('should filter by file type', async () => {
      // Create a PDF media item
      await Media.create({
        filename: 'document.pdf',
        originalFilename: 'document.pdf',
        path: 'uploads/document.pdf',
        url: '/uploads/document.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedBy: testUser._id,
        title: 'Test PDF'
      });

      const response = await request(app)
        .get('/api/media?fileType=image')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.media.length).toBe(1);
      expect(response.body.media[0].mimeType).toBe('image/jpeg');
    });
  });

  describe('uploadMedia', () => {
    test('should upload a single file successfully', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', 'uploads/test-image.jpg')
        .field('title', 'Uploaded Test Image')
        .field('description', 'An image uploaded during testing')
        .field('isPublic', 'true');

      expect(response.statusCode).toBe(201);
      expect(response.body.title).toBe('Uploaded Test Image');
      expect(response.body.description).toBe('An image uploaded during testing');
      expect(response.body.isPublic).toBe(true);
      expect(response.body.uploadedBy.toString()).toBe(testUser._id.toString());
    });

    test('should fail when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'No File Image');

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('No file uploaded');
    });
  });

  describe('uploadMultipleMedia', () => {
    test('should upload multiple files successfully', async () => {
      const response = await request(app)
        .post('/api/media/upload/multiple')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('files', 'uploads/test-image.jpg')
        .attach('files', 'uploads/test-document.pdf')
        .field('folder', 'test-folder')
        .field('isPublic', 'true');

      expect(response.statusCode).toBe(201);
      expect(response.body.media.length).toBe(2);
      expect(response.body.success).toBe(2);
      expect(response.body.failed).toBe(0);
      
      // Check that both files have the correct folder
      expect(response.body.media[0].folder).toBe('test-folder');
      expect(response.body.media[1].folder).toBe('test-folder');
    });
  });

  describe('analyzeMedia', () => {
    test('should analyze an image and apply AI-generated metadata', async () => {
      const response = await request(app)
        .post(`/api/media/${testMedia._id}/analyze`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.media.aiTags).toEqual(['test', 'image', 'mock']);
      expect(response.body.media.aiDescription).toBe('This is a test image description');
      expect(response.body.media.accessibilityText).toBe('Test image alt text');
    });

    test('should fail for non-image files', async () => {
      // Create a PDF media item
      const pdfMedia = await Media.create({
        filename: 'test-document.pdf',
        originalFilename: 'test-document.pdf',
        path: 'uploads/test-document.pdf',
        url: '/uploads/test-document.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedBy: testUser._id,
        title: 'Test PDF'
      });

      const response = await request(app)
        .post(`/api/media/${pdfMedia._id}/analyze`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('Only images can be analyzed');
    });
  });

  describe('createVariant', () => {
    test('should create an image variant', async () => {
      // Mock sharp module for image processing
      jest.mock('sharp', () => {
        return jest.fn().mockImplementation(() => ({
          resize: jest.fn().mockReturnThis(),
          grayscale: jest.fn().mockReturnThis(),
          blur: jest.fn().mockReturnThis(),
          sharpen: jest.fn().mockReturnThis(),
          toFile: jest.fn().mockResolvedValue(),
          metadata: jest.fn().mockResolvedValue({ width: 300, height: 200 })
        }));
      });

      const response = await request(app)
        .post(`/api/media/${testMedia._id}/variants`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'thumbnail',
          width: 200,
          height: 150,
          effects: ['grayscale']
        });

      // Reset the mock to prevent affecting other tests
      jest.resetModules();

      // Since we mocked sharp, we can't actually create the variant file,
      // but we can check that the API response is correct
      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.variant.name).toBe('thumbnail');
      expect(response.body.variant.effects).toContain('grayscale');
    });
  });
}); 