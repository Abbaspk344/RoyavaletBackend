import express from 'express';
import { body } from 'express-validator';
import {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats
} from '../controllers/contactController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Validation middleware for contact creation
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage('Please provide a valid phone number (10-15 digits)'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
];

// Validation middleware for contact updates
const validateContactUpdate = [
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid status value'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority value'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Notes must be between 1 and 500 characters')
];

// Public Routes
// @route   POST /api/contact
// @desc    Create new contact
// @access  Public
router.post('/', validateContact, createContact);

// Protected Routes (Admin only)
// @route   GET /api/contact/stats
// @desc    Get contact statistics
// @access  Private/Admin
router.get('/stats', auth, getContactStats);

// @route   GET /api/contact
// @desc    Get all contacts with pagination and filtering
// @access  Private/Admin
router.get('/', auth, getContacts);

// @route   GET /api/contact/:id
// @desc    Get single contact
// @access  Private/Admin
router.get('/:id', auth, getContact);

// @route   PUT /api/contact/:id
// @desc    Update contact
// @access  Private/Admin
router.put('/:id', auth, validateContactUpdate, updateContact);

// @route   DELETE /api/contact/:id
// @desc    Delete contact
// @access  Private/Admin
router.delete('/:id', auth, deleteContact);

export default router;
