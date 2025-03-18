const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../app');
const Content = require('../../models/content.model');
const ContentVersion = require('../../models/contentVersion.model');
const ContentSchedule = require('../../models/contentSchedule.model');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

let mongoServer;
let adminToken, authorToken;
let adminUser, authorUser;
let testContent;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create test users
  adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  });

  authorUser = await User.create({
    firstName: 'Author',
    lastName: 'User',
    email: 'author@test.com',
    password: 'password123',
    role: 'author'
  });

  // Generate tokens
  adminToken = jwt.sign({ id: adminUser._id }, config.app.jwtSecret, {
    expiresIn: '1h'
  });

  authorToken = jwt.sign({ id: authorUser._id }, config.app.jwtSecret, {
    expiresIn: '1h'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await Content.deleteMany({});
  await ContentVersion.deleteMany({});
  await ContentSchedule.deleteMany({});

  // Create a test content item
  testContent = await Content.create({
    title: 'Test Content',
    content: 'This is test content',
    slug: 'test-content',
    status: 'draft',
    author: authorUser._id
  });
});

describe('Content Controller', () => {
  describe('createContent', () => {
    test('should create new content successfully', async () => {
      const newContent = {
        title: 'New Test Content',
        content: 'This is new test content',
        excerpt: 'A brief excerpt',
        status: 'draft',
        tags: ['test', 'content'],
        featured: true
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(newContent);

      expect(response.statusCode).toBe(201);
      expect(response.body.content.title).toBe(newContent.title);
      expect(response.body.content.slug).toBe('new-test-content');
      expect(response.body.content.author.toString()).toBe(authorUser._id.toString());

      // Check that a version was created
      const versions = await ContentVersion.find({ contentId: response.body.content._id });
      expect(versions.length).toBe(1);
      expect(versions[0].comment).toBe('Initial creation');
    });

    test('should fail if title is missing', async () => {
      const invalidContent = {
        content: 'Content without title',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(invalidContent);

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toHaveProperty('title');
    });

    test('should schedule content for future publishing', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const scheduledContent = {
        title: 'Scheduled Content',
        content: 'This content will be published tomorrow',
        status: 'draft',
        publishDate: tomorrow.toISOString()
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(scheduledContent);

      expect(response.statusCode).toBe(201);

      // Check that a schedule was created
      const schedule = await ContentSchedule.findOne({ 
        contentId: response.body.content._id,
        action: 'publish'
      });
      
      expect(schedule).not.toBeNull();
      expect(new Date(schedule.scheduledDate).toDateString()).toBe(tomorrow.toDateString());
    });
  });

  describe('updateContent', () => {
    test('should update existing content', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content text',
        versionComment: 'Updated for testing'
      };

      const response = await request(app)
        .put(`/api/content/${testContent._id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(updates);

      expect(response.statusCode).toBe(200);
      expect(response.body.content.title).toBe(updates.title);
      expect(response.body.content.content).toBe(updates.content);

      // Check that a version was created
      const versions = await ContentVersion.find({ contentId: testContent._id });
      expect(versions.length).toBe(1);
      expect(versions[0].comment).toBe('Updated for testing');
    });

    test('should fail if user not authorized', async () => {
      // Create content by admin
      const adminContent = await Content.create({
        title: 'Admin Content',
        content: 'This is admin content',
        slug: 'admin-content',
        status: 'draft',
        author: adminUser._id
      });

      const updates = {
        title: 'Trying to update admin content'
      };

      const response = await request(app)
        .put(`/api/content/${adminContent._id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(updates);

      expect(response.statusCode).toBe(403);
    });

    test('should update scheduling information', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const updates = {
        title: 'Content with updated schedule',
        publishDate: tomorrow.toISOString()
      };

      const response = await request(app)
        .put(`/api/content/${testContent._id}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(updates);

      expect(response.statusCode).toBe(200);

      // Check that a schedule was created
      const schedule = await ContentSchedule.findOne({ 
        contentId: testContent._id,
        action: 'publish'
      });
      
      expect(schedule).not.toBeNull();
      expect(new Date(schedule.scheduledDate).toDateString()).toBe(tomorrow.toDateString());
    });
  });

  describe('getContentVersions', () => {
    test('should return content versions', async () => {
      // Create some versions
      await ContentVersion.create({
        contentId: testContent._id,
        title: testContent.title,
        content: testContent.content,
        status: testContent.status,
        comment: 'First version',
        createdBy: authorUser._id,
        createdAt: new Date(Date.now() - 3600000)
      });

      await ContentVersion.create({
        contentId: testContent._id,
        title: 'Updated title',
        content: 'Updated content',
        status: testContent.status,
        comment: 'Second version',
        createdBy: authorUser._id,
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/content/${testContent._id}/versions`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.versions.length).toBe(2);
      expect(response.body.versions[0].comment).toBe('Second version');
      expect(response.body.versions[1].comment).toBe('First version');
    });
  });

  describe('scheduleContent', () => {
    test('should schedule content for publication', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post(`/api/content/${testContent._id}/schedule`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          date: tomorrow.toISOString(),
          action: 'publish'
        });

      expect(response.statusCode).toBe(200);
      
      // Check that the schedule exists
      const schedule = await ContentSchedule.findOne({ 
        contentId: testContent._id,
        action: 'publish'
      });
      
      expect(schedule).not.toBeNull();
      expect(new Date(schedule.scheduledDate).toDateString()).toBe(tomorrow.toDateString());
    });

    test('should remove schedule when requested', async () => {
      // First create a schedule
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await ContentSchedule.create({
        contentId: testContent._id,
        action: 'publish',
        scheduledDate: tomorrow
      });

      // Then delete it
      const response = await request(app)
        .delete(`/api/content/${testContent._id}/schedule?action=publish`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.statusCode).toBe(200);
      
      // Check that the schedule was deleted
      const schedule = await ContentSchedule.findOne({ 
        contentId: testContent._id,
        action: 'publish'
      });
      
      expect(schedule).toBeNull();
    });
  });
}); 