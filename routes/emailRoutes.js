import express from 'express';
import { body } from 'express-validator';
import {
  subscribeEmail,
  unsubscribeEmail,
  getSubscriptions,
  getEmailStats,
  updateSubscription,
  deleteSubscription
} from '../controllers/emailController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Validation middleware for email subscription
const validateEmailSubscription = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('source')
    .optional()
    .isIn(['website-footer', 'website-popup', 'manual', 'import'])
    .withMessage('Invalid source value'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.newsletters')
    .optional()
    .isBoolean()
    .withMessage('Newsletter preference must be boolean'),
  
  body('preferences.promotions')
    .optional()
    .isBoolean()
    .withMessage('Promotions preference must be boolean'),
  
  body('preferences.updates')
    .optional()
    .isBoolean()
    .withMessage('Updates preference must be boolean'),
  
  body('preferences.events')
    .optional()
    .isBoolean()
    .withMessage('Events preference must be boolean')
];

// Validation middleware for unsubscription
const validateEmailUnsubscription = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
];

// Validation middleware for subscription updates
const validateSubscriptionUpdate = [
  body('status')
    .optional()
    .isIn(['active', 'unsubscribed', 'bounced', 'complained'])
    .withMessage('Invalid status value'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

// Public Routes
// @route   POST /api/email/subscribe
// @desc    Subscribe to email list
// @access  Public
router.post('/subscribe', validateEmailSubscription, subscribeEmail);

// @route   POST /api/email/unsubscribe
// @desc    Unsubscribe from email list
// @access  Public
router.post('/unsubscribe', validateEmailUnsubscription, unsubscribeEmail);

// Protected Routes (Admin only)
// @route   GET /api/email/stats
// @desc    Get email subscription statistics
// @access  Private/Admin
router.get('/stats', auth, getEmailStats);

// @route   GET /api/email/subscriptions
// @desc    Get all email subscriptions with pagination and filtering
// @access  Private/Admin
router.get('/subscriptions', auth, getSubscriptions);

// @route   PUT /api/email/subscription/:id
// @desc    Update email subscription
// @access  Private/Admin
router.put('/subscription/:id', auth, validateSubscriptionUpdate, updateSubscription);

// @route   DELETE /api/email/subscription/:id
// @desc    Delete email subscription
// @access  Private/Admin
router.delete('/subscription/:id', auth, deleteSubscription);

export default router;
