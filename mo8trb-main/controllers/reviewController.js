// controllers/reviewController.js
import Review from "../models/Review.js";
import Apartment from "../models/Apartment.js";

export const createReview = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const { rating, comment } = req.body;

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) return res.status(404).json({ success: false, message: "Apartment not found" });

    const existingReview = await Review.findOne({ apartment: apartmentId, user: req.user._id });
    if (existingReview) return res.status(400).json({ success: false, message: "You already reviewed this apartment" });

    const newReview = await Review.create({
      apartment: apartmentId,
      user: req.user._id,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: newReview });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getApartmentReviews = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const reviews = await Review.find({ apartment: apartmentId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

    res.json({
      success: true,
      count: reviews.length,
      averageRating: parseFloat(averageRating.toFixed(1)),
      data: reviews,
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    res.json({ success: true, data: review });
  } catch (err) {
    console.error("Update review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await review.deleteOne();

    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
