const express = require('express');
const router = express.Router();
const { protect, admin, optionalAuth, authorize } = require('../middleware/auth.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');

// Import controller methods
const contentController = require('../controllers/content.controller');

// Use optional authentication for all routes
router.use(optionalAuth);

// Public routes
router.get('/published', contentController.getAllContent);
router.get('/published/:slug', contentController.getContent);
router.get('/categories', contentController.getCategories);
router.get('/categories/:slug', contentController.getCategoryBySlug);
router.get('/search', contentController.searchContent);

// Content CRUD operations - protected routes
router.get('/', contentController.getAllContent);
router.post('/', protect, uploadSingle, contentController.createContent);
router.get('/:id', contentController.getContent);
router.put('/:id', protect, uploadSingle, contentController.updateContent);
router.delete('/:id', protect, contentController.deleteContent);

// Content special operations - protected routes
router.patch('/:id/status', protect, contentController.updateContentStatus);
router.post('/:id/analyze', protect, contentController.analyzeContent);
router.get('/:id/suggestions', protect, contentController.getContentSuggestions);
router.post('/:id/suggestions/:suggestionId/apply', protect, contentController.applySuggestion);
router.get('/:id/revisions', protect, contentController.getContentRevisions);
router.post('/:id/revisions/:revisionId/restore', protect, contentController.restoreRevision);

// Category operations - restricted to admins and editors
router.use('/categories', protect);
router.post('/categories', contentController.createCategory);
router.put('/categories/:id', contentController.updateCategory);
router.delete('/categories/:id', contentController.deleteCategory);

// Versioning
router.get('/:id/versions', contentController.getContentVersions);
router.post('/:id/versions/:versionId/restore', contentController.restoreVersion);

// Scheduling
router.route('/:id/schedule')
  .get(contentController.getContentSchedule)
  .post(contentController.scheduleContent)
  .delete(contentController.unscheduleContent);

// Templates
router.get('/templates', contentController.getTemplates);
router.post('/templates', contentController.createTemplate);
router.post('/templates/:id/use', contentController.useTemplate);

module.exports = router; 