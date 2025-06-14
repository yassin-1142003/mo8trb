// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ apartment: 1, user: 1 }, { unique: true }); // كل مستخدم يقيم مرة واحدة فقط لكل شقة

export default mongoose.model("Review", reviewSchema);
