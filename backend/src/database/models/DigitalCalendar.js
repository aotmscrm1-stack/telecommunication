const mongoose = require('mongoose');

const PLATFORM_STATUSES = [
  'Not Required',
  'Planned',
  'Draft',
  'In Design',
  'Ready',
  'Scheduled',
  'Posted',
  'Failed',
  'Pending'
];

const CONTENT_TYPES = [
  'Post',
  'Reel',
  'Carousel',
  'Story',
  'Poster',
  'Video',
  'Short',
  'Article',
  'Announcement',
  'Promotional',
  'Educational',
  'Testimonial',
  'Other'
];

const OVERALL_STATUSES = [
  'Planned',
  'Draft',
  'In Design',
  'Ready to Post',
  'Scheduled',
  'Posted',
  'Pending Platforms',
  'Failed',
  'Needs Approval'
];

const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'];

const digitalCalendarSchema = new mongoose.Schema(
  {
    content_title: {
      type: String,
      required: [true, 'Content / Topic title is required'],
      trim: true
    },
    content_type: {
      type: String,
      enum: CONTENT_TYPES,
      default: 'Post'
    },
    content_date: {
      type: Date,
      required: [true, 'Content date is required'],
      index: true
    },
    day: {
      type: String,
      trim: true,
      default: ''
    },
    responsible_employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    responsible_employee_name: {
      type: String,
      trim: true,
      default: ''
    },
    approval_status: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'Pending',
      index: true
    },
    overall_status: {
      type: String,
      enum: OVERALL_STATUSES,
      default: 'Planned',
      index: true
    },
    live_folder_link: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },

    // Platform wise tracking
    instagram_status: {
      type: String,
      enum: PLATFORM_STATUSES,
      default: 'Not Required'
    },
    instagram_time: {
      type: String,
      trim: true,
      default: ''
    },

    youtube_status: {
      type: String,
      enum: PLATFORM_STATUSES,
      default: 'Not Required'
    },
    youtube_time: {
      type: String,
      trim: true,
      default: ''
    },

    linkedin_status: {
      type: String,
      enum: PLATFORM_STATUSES,
      default: 'Not Required'
    },
    linkedin_time: {
      type: String,
      trim: true,
      default: ''
    },

    x_status: {
      type: String,
      enum: PLATFORM_STATUSES,
      default: 'Not Required'
    },
    x_time: {
      type: String,
      trim: true,
      default: ''
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    department_name: {
      type: String,
      default: 'Marketing'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

digitalCalendarSchema.index({ content_date: 1, department_name: 1 });

module.exports = mongoose.model('DigitalCalendar', digitalCalendarSchema);
