import mongoose from 'mongoose';
const apartmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters'] // Increased from 100
  },
  description: {
    type: String,
    required: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'] // Increased from 1000
  },ce: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  bedrooms: {
    type: Number,
    required: [true, 'Number of bedrooms is required'],
    min: [0, 'Bedrooms cannot be negative'],
    max: [20, 'Bedrooms cannot exceed 20']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Number of bathrooms is required'],
    min: [0, 'Bathrooms cannot be negative'],
    max: [10, 'Bathrooms cannot exceed 10']
  },
  square_fee: {
    type: Number,
    required: [true, 'Square footage is required'],
    min: [1, 'Square footage must be at least 1']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  town: {
    type: String,
    trim: true
  },
  is_furnished: {
    type: Boolean,
    default: false
  },
  floor_number: {
    type: Number,
    min: [0, 'Floor number cannot be negative'],
    max: [200, 'Floor number cannot exceed 200']
  },
  is_featured: {
    type: Boolean,
    default: false
  },
  listing_type: {
    type: String,
    enum: {
      values: ['for_rent', 'for_sale', 'both'],
      message: 'Listing type must be either for_rent, for_sale, or both'
    },
    required: [true, 'Listing type is required']
  },
  availability_date: {
    type: Date
  },
  features: [{
    type: String,
    trim: true
  }],
  apartment_pics: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  status: {
    type: String,
    enum: ['available', 'for_rent', 'for_sale', 'both'],
    default: 'available'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better query performance
apartmentSchema.index({ city: 1, listing_type: 1 });
apartmentSchema.index({ price: 1 });
apartmentSchema.index({ owner: 1 });
apartmentSchema.index({ is_featured: 1 });
apartmentSchema.index({ createdAt: -1 });

// Virtual for price per square foot
apartmentSchema.virtual('pricePerSquareFoot').get(function() {
  return this.square_fee > 0 ? (this.price / this.square_fee).toFixed(2) : 0;
});

// Pre-save middleware to ensure data consistency
apartmentSchema.pre('save', function(next) {
  // Ensure features array doesn't have empty strings
  if (this.features) {
    this.features = this.features.filter(feature => feature && feature.trim() !== '');
  }
  
  // Ensure apartment_pics array doesn't have empty strings
  if (this.apartment_pics) {
    this.apartment_pics = this.apartment_pics.filter(pic => pic && pic.trim() !== '');
  }
  
  next();
});

// ✅ Safe model creation - prevents "Cannot overwrite model" error
const Apartment = mongoose.models.Apartment || mongoose.model('Apartment', apartmentSchema);

export default Apartment;