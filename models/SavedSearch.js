import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    search_name: {
      type: String,
      required: false, // Changed from true to false
      trim: true,
      default: function() {
        return `Search ${new Date().toLocaleDateString()}`;
      }
    },
    search_criteria: {
      // Location filters
      city: String,
      town: String,
      address: String,
     
      // Price filters
      min_price: Number,
      max_price: Number,
     
      // Property details
      bedrooms: Number,
      bathrooms: Number,
      min_square_feet: Number,
      max_square_feet: Number,
     
      // Property features
      is_furnished: Boolean,
      listing_type: {
        type: String,
        enum: ['for_rent', 'for_sale', 'both']
      },
     
      // Additional filters
      features: [String],
      min_floor: Number,
      max_floor: Number
    },
   
    // Notification settings
    email_alerts: {
      type: Boolean,
      default: true
    },
   
    // Search metadata
    last_executed: {
      type: Date,
      default: Date.now
    },
   
    results_count: {
      type: Number,
      default: 0
    },
   
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
savedSearchSchema.index({ user: 1, created_at: -1 });
savedSearchSchema.index({ user: 1, is_active: 1 });

const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
export default SavedSearch;