import mongoose from 'mongoose';

const emailSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced', 'complained'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['website-footer', 'website-popup', 'manual', 'import'],
    default: 'website-footer'
  },
  subscriptionDate: {
    type: Date,
    default: Date.now
  },
  unsubscriptionDate: {
    type: Date,
    default: null
  },
  unsubscriptionReason: {
    type: String,
    default: null
  },
  preferences: {
    newsletters: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    updates: {
      type: Boolean,
      default: true
    },
    events: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    referrer: {
      type: String,
      default: null
    },
    country: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  emailsSent: {
    type: Number,
    default: 0
  },
  emailsOpened: {
    type: Number,
    default: 0
  },
  emailsClicked: {
    type: Number,
    default: 0
  },
  lastEmailSent: {
    type: Date,
    default: null
  },
  lastEmailOpened: {
    type: Date,
    default: null
  },
  lastEmailClicked: {
    type: Date,
    default: null
  },
  verificationToken: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for engagement rate
emailSubscriptionSchema.virtual('engagementRate').get(function() {
  if (this.emailsSent === 0) return 0;
  return Math.round((this.emailsOpened / this.emailsSent) * 100);
});

// Virtual for click rate
emailSubscriptionSchema.virtual('clickRate').get(function() {
  if (this.emailsOpened === 0) return 0;
  return Math.round((this.emailsClicked / this.emailsOpened) * 100);
});

// Virtual for subscription duration
emailSubscriptionSchema.virtual('subscriptionDuration').get(function() {
  const endDate = this.unsubscriptionDate || new Date();
  return Math.floor((endDate - this.subscriptionDate) / (1000 * 60 * 60 * 24));
});

// Index for better query performance
emailSubscriptionSchema.index({ email: 1 }, { unique: true });
emailSubscriptionSchema.index({ status: 1 });
emailSubscriptionSchema.index({ source: 1 });
emailSubscriptionSchema.index({ subscriptionDate: -1 });
emailSubscriptionSchema.index({ 'preferences.newsletters': 1 });
emailSubscriptionSchema.index({ tags: 1 });

// Pre-save middleware
emailSubscriptionSchema.pre('save', function(next) {
  // Set verification status if email is being verified
  if (this.isModified('isVerified') && this.isVerified && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  
  // Set unsubscription date if status changes to unsubscribed
  if (this.isModified('status') && this.status === 'unsubscribed' && !this.unsubscriptionDate) {
    this.unsubscriptionDate = new Date();
  }
  
  next();
});

// Static method to find active subscribers
emailSubscriptionSchema.statics.findActiveSubscribers = function() {
  return this.find({ status: 'active', isVerified: true });
};

// Static method to get subscription stats
emailSubscriptionSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

export default mongoose.model('EmailSubscription', emailSubscriptionSchema);
