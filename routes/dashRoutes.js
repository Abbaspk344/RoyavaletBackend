import express from 'express';
import Contact from '../models/Contact.js';
import EmailSubscription from '../models/EmailSubscription.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private/Admin
router.get('/overview', auth, async (req, res) => {
  try {
    // Get current date ranges
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Contact Statistics
    const contactStats = {
      total: await Contact.countDocuments(),
      today: await Contact.countDocuments({ createdAt: { $gte: startOfToday } }),
      thisWeek: await Contact.countDocuments({ createdAt: { $gte: startOfWeek } }),
      thisMonth: await Contact.countDocuments({ createdAt: { $gte: startOfMonth } }),
      thisYear: await Contact.countDocuments({ createdAt: { $gte: startOfYear } }),
      byStatus: await Contact.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      byPriority: await Contact.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    };

    // Email Subscription Statistics
    const emailStats = {
      total: await EmailSubscription.countDocuments(),
      active: await EmailSubscription.countDocuments({ status: 'active' }),
      today: await EmailSubscription.countDocuments({ subscriptionDate: { $gte: startOfToday } }),
      thisWeek: await EmailSubscription.countDocuments({ subscriptionDate: { $gte: startOfWeek } }),
      thisMonth: await EmailSubscription.countDocuments({ subscriptionDate: { $gte: startOfMonth } }),
      thisYear: await EmailSubscription.countDocuments({ subscriptionDate: { $gte: startOfYear } }),
      byStatus: await EmailSubscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      bySource: await EmailSubscription.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ])
    };

    // User Statistics
    const userStats = {
      total: await User.countDocuments(),
      active: await User.countDocuments({ isActive: true }),
      admins: await User.countDocuments({ role: 'admin' }),
      thisMonth: await User.countDocuments({ createdAt: { $gte: startOfMonth } })
    };

    // Recent Activities
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status priority createdAt');

    const recentSubscriptions = await EmailSubscription.find()
      .sort({ subscriptionDate: -1 })
      .limit(5)
      .select('email status source subscriptionDate');

    // Growth Trends (last 30 days)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const contactGrowth = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const emailGrowth = await EmailSubscription.aggregate([
      {
        $match: { subscriptionDate: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscriptionDate' },
            month: { $month: '$subscriptionDate' },
            day: { $dayOfMonth: '$subscriptionDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        contacts: contactStats,
        emails: emailStats,
        users: userStats,
        recent: {
          contacts: recentContacts,
          subscriptions: recentSubscriptions
        },
        growth: {
          contacts: contactGrowth,
          emails: emailGrowth
        }
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get detailed analytics data
// @access  Private/Admin
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateRange;
    switch (period) {
      case '7d':
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        dateRange = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Contact conversion funnel
    const contactFunnel = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: dateRange } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Email engagement metrics
    const emailEngagement = await EmailSubscription.aggregate([
      {
        $match: { 
          subscriptionDate: { $gte: dateRange },
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalSubscribers: { $sum: 1 },
          totalEmailsSent: { $sum: '$emailsSent' },
          totalEmailsOpened: { $sum: '$emailsOpened' },
          totalEmailsClicked: { $sum: '$emailsClicked' },
          avgEngagementRate: { $avg: '$engagementRate' }
        }
      }
    ]);

    // Top sources for contacts and emails
    const topContactSources = await Contact.aggregate([
      {
        $match: { createdAt: { $gte: dateRange } }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const topEmailSources = await EmailSubscription.aggregate([
      {
        $match: { subscriptionDate: { $gte: dateRange } }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        contactFunnel,
        emailEngagement: emailEngagement[0] || {
          totalSubscribers: 0,
          totalEmailsSent: 0,
          totalEmailsOpened: 0,
          totalEmailsClicked: 0,
          avgEngagementRate: 0
        },
        topSources: {
          contacts: topContactSources,
          emails: topEmailSources
        }
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

export default router;
