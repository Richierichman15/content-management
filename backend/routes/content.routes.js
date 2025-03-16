const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/auth.middleware');
const { uploadFields } = require('../middleware/upload.middleware');

// Import controller methods
const contentController = require('../controllers/content.controller');

// Use optional authentication for all routes
router.use(optionalAuth);

// Public routes
router.get('/published', contentController.getPublishedContent);
router.get('/published/:slug', contentController.getPublishedContentBySlug);
router.get('/categories', contentController.getCategories);
router.get('/categories/:slug', contentController.getCategoryBySlug);
router.get('/search', contentController.searchContent);

// Content CRUD operations - protected routes
router.get('/', contentController.getAllContent);
router.post('/', protect, uploadFields, contentController.createContent);
router.get('/:id', contentController.getContent);
router.put('/:id', protect, uploadFields, contentController.updateContent);
router.delete('/:id', protect, contentController.deleteContent);

// Content special operations - protected routes
router.patch('/:id/status', protect, contentController.updateContentStatus);
router.post('/:id/analyze', protect, contentController.analyzeContent);
router.get('/:id/suggestions', protect, contentController.getContentSuggestions);
router.post('/:id/suggestions/:suggestionId/apply', protect, contentController.applySuggestion);
router.get('/:id/revisions', protect, contentController.getContentRevisions);
router.post('/:id/revisions/:revisionId/restore', protect, contentController.restoreContentRevision);

// Category operations - restricted to admins and editors
router.use('/categories', protect, restrictTo('admin', 'editor'));
router.post('/categories', contentController.createCategory);
router.put('/categories/:id', contentController.updateCategory);
router.delete('/categories/:id', contentController.deleteCategory);

module.exports = router; 