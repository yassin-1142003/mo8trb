import Apartment from '../models/Apartment.js';
import path from 'path';
import fs from 'fs';

export const createApartment = async (req, res) => {
  try {
    const { title, description, price, location } = req.body;
    const images = req.files?.map(file => file.path) || [];

    const apartment = new Apartment({
      title,
      description,
      price,
      location,
      apartment_pics: images,
      owner: req.user._id,
    });

    await apartment.save();

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      apartment,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating apartment', error: err.message });
  }
};

export const getAllApartments = async (req, res) => {
  try {
    const apartments = await Apartment.find().populate('owner', 'name email');
    res.json({ success: true, apartments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching apartments', error: err.message });
  }
};

export const getMyApartments = async (req, res) => {
  try {
    const myApartments = await Apartment.find({ owner: req.user._id });
    res.json({ success: true, apartments: myApartments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user apartments', error: err.message });
  }
};

export const getApartmentById = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id).populate('owner', 'name email');
    if (!apartment) return res.status(404).json({ success: false, message: 'Apartment not found' });

    res.json({ success: true, apartment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching apartment', error: err.message });
  }
};

export const updateApartment = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);
    if (!apartment) return res.status(404).json({ success: false, message: 'Apartment not found' });

    if (apartment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { title, description, price, location } = req.body;
    const newImages = req.files?.map(file => file.path) || [];

    if (newImages.length > 0) {
      apartment.apartment_pics.push(...newImages);
    }

    apartment.title = title || apartment.title;
    apartment.description = description || apartment.description;
    apartment.price = price || apartment.price;
    apartment.location = location || apartment.location;

    await apartment.save();

    res.json({ success: true, message: 'Apartment updated', apartment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating apartment', error: err.message });
  }
};

export const deleteApartment = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);
    if (!apartment) return res.status(404).json({ success: false, message: 'Apartment not found' });

    if (apartment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    apartment.apartment_pics.forEach(filePath => {
      fs.unlink(filePath, err => {
        if (err) console.error(`Error deleting file: ${filePath}`, err);
      });
    });

    await apartment.deleteOne();

    res.json({ success: true, message: 'Apartment deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting apartment', error: err.message });
  }
};

export const bookApartment = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const userId = req.user._id;

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.bookings.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You already booked this apartment' });
    }

    apartment.bookings.push(userId);
    await apartment.save();

    res.status(200).json({ success: true, message: 'Apartment booked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error booking apartment', error: err.message });
  }
};
