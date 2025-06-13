import SavedSearch from "../models/SavedSearch.js";
import Apartment from "../models/Apartment.js"; // Changed from named import to default import

// Create a new saved search
export const createSavedSearch = async (req, res) => {
  try {
    const { search_name, search_criteria, email_alerts = true } = req.body;
    
    // Only search_criteria is required now
    if (!search_criteria) {
      return res.status(400).json({
        success: false,
        message: "Search criteria are required"
      });
    }

    // Generate default search_name if not provided
    let finalSearchName = search_name;
    if (!finalSearchName) {
      // Generate unique name with timestamp
      const timestamp = Date.now();
      finalSearchName = `Search ${new Date().toLocaleDateString()} ${timestamp.toString().slice(-4)}`;
    }

    // Remove unique name check - allow duplicate names
    // Users can have multiple saved searches with same name

    const savedSearch = new SavedSearch({
      user: req.user._id,
      search_name: finalSearchName.trim(),
      search_criteria,
      email_alerts
    });

    await savedSearch.save();

    res.status(201).json({
      success: true,
      message: "Search saved successfully",
      data: savedSearch
    });

  } catch (error) {
    console.error("Create saved search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving search"
    });
  }
};

// Get all saved searches for the authenticated user
export const getUserSavedSearches = async (req, res) => {
  try {
    const savedSearches = await SavedSearch.find({
      user: req.user._id,
      is_active: true
    }).sort({ created_at: -1 });

    res.json({
      success: true,
      data: savedSearches,
      count: savedSearches.length
    });

  } catch (error) {
    console.error("Get saved searches error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching saved searches"
    });
  }
};

// Get a specific saved search
export const getSavedSearchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const savedSearch = await SavedSearch.findOne({
      _id: id,
      user: req.user._id,
      is_active: true
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found"
      });
    }

    res.json({
      success: true,
      data: savedSearch
    });

  } catch (error) {
    console.error("Get saved search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching saved search"
    });
  }
};

// Execute a saved search (run the search and return results)
export const executeSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const savedSearch = await SavedSearch.findOne({
      _id: id,
      user: req.user._id,
      is_active: true
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found"
      });
    }

    // Build query from saved criteria
    const query = {};
    const criteria = savedSearch.search_criteria;

    if (criteria.city) query.city = new RegExp(criteria.city, 'i');
    if (criteria.town) query.town = new RegExp(criteria.town, 'i');
    if (criteria.address) query.address = new RegExp(criteria.address, 'i');
    
    if (criteria.min_price || criteria.max_price) {
      query.price = {};
      if (criteria.min_price) query.price.$gte = criteria.min_price;
      if (criteria.max_price) query.price.$lte = criteria.max_price;
    }

    if (criteria.bedrooms) query.bedrooms = criteria.bedrooms;
    if (criteria.bathrooms) query.bathrooms = criteria.bathrooms;
    
    if (criteria.min_square_feet || criteria.max_square_feet) {
      query.square_fee = {};
      if (criteria.min_square_feet) query.square_fee.$gte = criteria.min_square_feet;
      if (criteria.max_square_feet) query.square_fee.$lte = criteria.max_square_feet;
    }

    if (criteria.is_furnished !== undefined) query.is_furnished = criteria.is_furnished;
    if (criteria.listing_type) query.listing_type = criteria.listing_type;

    if (criteria.min_floor || criteria.max_floor) {
      query.floor_number = {};
      if (criteria.min_floor) query.floor_number.$gte = criteria.min_floor;
      if (criteria.max_floor) query.floor_number.$lte = criteria.max_floor;
    }

    if (criteria.features && criteria.features.length > 0) {
      query.features = { $in: criteria.features };
    }

    // Date filters
    if (criteria.date_posted_from || criteria.date_posted_to) {
      query.createdAt = {};
      if (criteria.date_posted_from) {
        query.createdAt.$gte = new Date(criteria.date_posted_from);
      }
      if (criteria.date_posted_to) {
        query.createdAt.$lte = new Date(criteria.date_posted_to);
      }
    }

    if (criteria.availability_date_from || criteria.availability_date_to) {
      query.availability_date = {};
      if (criteria.availability_date_from) {
        query.availability_date.$gte = new Date(criteria.availability_date_from);
      }
      if (criteria.availability_date_to) {
        query.availability_date.$lte = new Date(criteria.availability_date_to);
      }
    }

    // Determine sort order
    const sortOrder = criteria.sort_by_date === 'oldest_first' ? 1 : -1;

    // Execute the search
    const apartments = await Apartment.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: sortOrder });

    // Update search metadata
    savedSearch.last_executed = new Date();
    savedSearch.results_count = apartments.length;
    await savedSearch.save();

    res.json({
      success: true,
      data: {
        search: savedSearch,
        results: apartments,
        count: apartments.length
      }
    });

  } catch (error) {
    console.error("Execute saved search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while executing search"
    });
  }
};

// Update a saved search
export const updateSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const { search_name, search_criteria, email_alerts } = req.body;

    const savedSearch = await SavedSearch.findOne({
      _id: id,
      user: req.user._id,
      is_active: true
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found"
      });
    }

    // Remove duplicate name check for updates - allow duplicate names
    // Users can have multiple saved searches with same name

    // Update fields
    if (search_name) savedSearch.search_name = search_name.trim();
    if (search_criteria) savedSearch.search_criteria = search_criteria;
    if (email_alerts !== undefined) savedSearch.email_alerts = email_alerts;

    await savedSearch.save();

    res.json({
      success: true,
      message: "Saved search updated successfully",
      data: savedSearch
    });

  } catch (error) {
    console.error("Update saved search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating saved search"
    });
  }
};

// Delete a saved search (soft delete)
export const deleteSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;

    const savedSearch = await SavedSearch.findOne({
      _id: id,
      user: req.user._id,
      is_active: true
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: "Saved search not found"
      });
    }

    // Soft delete
    savedSearch.is_active = false;
    await savedSearch.save();

    res.json({
      success: true,
      message: "Saved search deleted successfully"
    });

  } catch (error) {
    console.error("Delete saved search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting saved search"
    });
  }
};