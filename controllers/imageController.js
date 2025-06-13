// controllers/imageController.js
import fs from "fs";
import path from "path";
import Apartment from "../models/Apartment.js";

export const deleteImageFromApartment = async (req, res) => {
  const { apartmentId, filename } = req.params;

  if (!apartmentId || !filename) {
    return res
      .status(400)
      .json({ success: false, message: "Apartment ID and filename required" });
  }

  try {
    const apartment = await Apartment.findById(apartmentId);

    if (!apartment) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found" });
    }

    const imageIndex = apartment.apartment_pics.findIndex(
      (pic) => path.basename(pic) === filename
    );

    if (imageIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Image not found in apartment" });
    }

    // Remove from array
    const removedImage = apartment.apartment_pics.splice(imageIndex, 1)[0];
    await apartment.save();

    // Delete file from disk
    const imagePath = path.join("uploads", removedImage);
    fs.unlink(imagePath, (err) => {
      if (err) console.warn("⚠️ Failed to delete file:", err.message);
    });

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("❌ Delete image error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
