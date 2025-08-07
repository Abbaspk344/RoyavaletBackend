import EmailSubscription from '../models/EmailSubscription.js';
import { validationResult } from 'express-validator';

// @desc    Subscribe to email list
// @route   POST /api/email/subscribe
// @access  Public
const subscribeEmail = async (req, res) => {
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

    const { email, source = 'website-footer', preferences = {} } = req.body;

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const referrer = req.get('Referer');

    // Check if email already exists
    const existingSubscription = await EmailSubscription.findOne({ email });

    if (existingSubscription) {
      // If already subscribed and active
      if (existingSubscription.status === 'active') {
        return res.status(409).json({
          success: false,
          message: 'This email is already subscribed to our newsletter'
        });
      }
      
      // If previously unsubscribed, reactivate
      if (existingSubscription.status === 'unsubscribed') {
        existingSubscription.status = 'active';
        existingSubscription.subscriptionDate = new Date();
        existingSubscription.unsubscriptionDate = null;
        existingSubscription.unsubscriptionReason = null;
        existingSubscription.source = source;
        existingSubscription.metadata.ipAddress = ipAddress;
        existingSubscription.metadata.userAgent = userAgent;
        existingSubscription.metadata.referrer = referrer;
        
        // Update preferences if provided
        if (Object.keys(preferences).length > 0) {
          existingSubscription.preferences = { ...existingSubscription.preferences, ...preferences };
        }

        await existingSubscription.save();

        return res.status(200).json({
          success: true,
          message: 'Welcome back! Your email subscription has been reactivated.',
          data: {
            id: existingSubscription._id,
            email: existingSubscription.email,
            status: existingSubscription.status,
            subscriptionDate: existingSubscription.subscriptionDate
          }
        });
      }
    }

    // Create new subscription
    const subscription = new EmailSubscription({
      email,
      source,
      preferences: {
        newsletters: true,
        promotions: true,
        updates: true,
        events: true,
        ...preferences
      },
      metadata: {
        ipAddress,
        userAgent,
        referrer
      },
      isVerified: true, // Auto-verify for now, can add email verification later
      verifiedAt: new Date()
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! You will receive our latest updates and offers.',
      data: {
        id: subscription._id,
        email: subscription.email,
        status: subscription.status,
        subscriptionDate: subscription.subscriptionDate
      }
    });

  } catch (error) {
    console.error('Email subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe. Please try again later.'
    });
  }
};

// @desc    Unsubscribe from email list
// @route   POST /api/email/unsubscribe
// @access  Public
const unsubscribeEmail = async (req, res) => {
  try {
    const { email, reason } = req.body;

    const subscription = await EmailSubscription.findOne({ email });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list'
      });
    }

    if (subscription.status === 'unsubscribed') {
      return res.status(400).json({
        success: false,
        message: 'This email is already unsubscribed'
      });
    }

    subscription.status = 'unsubscribed';
    subscription.unsubscriptionDate = new Date();
    subscription.unsubscriptionReason = reason || 'User requested';

    await subscription.save();

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from our mailing list'
    });

  } catch (error) {
    console.error('Email unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again later.'
    });
  }
};

// @desc    Get all email subscriptions (Admin only)
// @route   GET /api/email/subscriptions
// @access  Private/Admin
const getSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const source = req.query.source;
    const search = req.query.search;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (source) {
      query.source = source;
    }
    
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const subscriptions = await EmailSubscription.find(query)
      .sort({ subscriptionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EmailSubscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
};

// @desc    Get email subscription statistics (Admin only)
// @route   GET /api/email/stats
// @access  Private/Admin
const getEmailStats = async (req, res) => {
  try {
    const stats = await EmailSubscription.getStats();
    
    const sourceStats = await EmailSubscription.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSubscriptions = await EmailSubscription.countDocuments();
    const activeSubscriptions = await EmailSubscription.countDocuments({ status: 'active' });
    const todaySubscriptions = await EmailSubscription.countDocuments({
      subscriptionDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    const thisWeekSubscriptions = await EmailSubscription.countDocuments({
      subscriptionDate: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    });

    const thisMonthSubscriptions = await EmailSubscription.countDocuments({
      subscriptionDate: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    // Calculate engagement metrics
    const engagementStats = await EmailSubscription.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          totalEmailsSent: { $sum: '$emailsSent' },
          totalEmailsOpened: { $sum: '$emailsOpened' },
          totalEmailsClicked: { $sum: '$emailsClicked' },
          avgEngagementRate: { $avg: '$engagementRate' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        today: todaySubscriptions,
        thisWeek: thisWeekSubscriptions,
        thisMonth: thisMonthSubscriptions,
        byStatus: stats,
        bySource: sourceStats,
        engagement: engagementStats[0] || {
          totalEmailsSent: 0,
          totalEmailsOpened: 0,
          totalEmailsClicked: 0,
          avgEngagementRate: 0
        }
      }
    });

  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email statistics'
    });
  }
};

// @desc    Update subscription preferences (Admin only)
// @route   PUT /api/email/subscription/:id
// @access  Private/Admin
const updateSubscription = async (req, res) => {
  try {
    const { status, preferences, tags } = req.body;

    const subscription = await EmailSubscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update fields
    if (status) subscription.status = status;
    if (preferences) subscription.preferences = { ...subscription.preferences, ...preferences };
    if (tags) subscription.tags = tags;

    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};

// @desc    Delete email subscription (Admin only)
// @route   DELETE /api/email/subscription/:id
// @access  Private/Admin
const deleteSubscription = async (req, res) => {
  try {
    const subscription = await EmailSubscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email subscription not found'
      });
    }

    await subscription.deleteOne();

    res.json({
      success: true,
      message: 'Email subscription deleted successfully'
    });

  } catch (error) {
    console.error('Delete email subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email subscription'
    });
  }
};

export {
  subscribeEmail,
  unsubscribeEmail,
  getSubscriptions,
  getEmailStats,
  updateSubscription,
  deleteSubscription
};
