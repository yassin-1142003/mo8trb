// models/image.model.js
import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    // لو عايز تربط الصورة بشقة مثلاً
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
    },
    // لو عايز تربطها بمستخدم مثلاً
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // ممكن تضيف نوع الاستخدام لو محتاج (صورة شخصية، بطاقة...الخ)
    usageType: {
      type: String,
      enum: ["profile", "apartment", "id_card", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
