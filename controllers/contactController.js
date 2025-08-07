import Contact from '../models/Contact.js';
import { validationResult } from 'express-validator';

// @desc    Create new contact
// @route   POST /api/contact
// @access  Public
const createContact = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, description } = req.body;

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if contact with same email already exists (within last 24 hours)
    const existingContact = await Contact.findOne({
      email: email,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    });

    if (existingContact) {
      return res.status(409).json({
        success: false,
        message: 'A contact request with this email was already submitted in the last 24 hours'
      });
    }

    // Create new contact
    const contact = new Contact({
      name,
      email,
      phone,
      description,
      ipAddress,
      userAgent,
      source: 'website'
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact request submitted successfully! We will get back to you soon.',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Contact creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact request. Please try again later.'
    });
  }
};

// @desc    Get all contacts (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
const getContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const priority = req.query.priority;
    const search = req.query.search;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
};

// @desc    Get single contact (Admin only)
// @route   GET /api/contact/:id
// @access  Private/Admin
const getContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('assignedTo', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact'
    });
  }
};

// @desc    Update contact (Admin only)
// @route   PUT /api/contact/:id
// @access  Private/Admin
const updateContact = async (req, res) => {
  try {
    const { status, priority, assignedTo, notes } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Update fields
    if (status) contact.status = status;
    if (priority) contact.priority = priority;
    if (assignedTo) contact.assignedTo = assignedTo;
    
    // Add note if provided
    if (notes) {
      contact.notes.push({
        note: notes,
        addedBy: req.user?.name || 'admin',
        addedAt: new Date()
      });
    }

    await contact.save();

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact'
    });
  }
};

// @desc    Delete contact (Admin only)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.deleteOne();

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact'
    });
  }
};

// @desc    Get contact statistics (Admin only)
// @route   GET /api/contact/stats
// @access  Private/Admin
const getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Contact.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalContacts = await Contact.countDocuments();
    const todayContacts = await Contact.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const thisWeekContacts = await Contact.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });

    const thisMonthContacts = await Contact.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    res.json({
      success: true,
      data: {
        total: totalContacts,
        today: todayContacts,
        thisWeek: thisWeekContacts,
        thisMonth: thisMonthContacts,
        byStatus: stats,
        byPriority: priorityStats
      }
    });

  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics'
    });
  }
};

export {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats
};
