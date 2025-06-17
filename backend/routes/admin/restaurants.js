const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Restaurant = require('../../models/Restaurant');
const FoodItem = require('../../models/FoodItem');

router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().select('-passwordHash');
    res.json(restaurants);
  } catch (err) {
    console.error('Error fetching restaurants:', err);
    res.status(500).json({ message: 'Server error while fetching restaurants' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, password, providerType, description } = req.body;

    // Validation
    if (!name || !password || !providerType) {
      return res.status(400).json({ message: 'Name, password and provider type are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!['university', 'student', 'admin'].includes(providerType)) {
      return res.status(400).json({ message: 'Invalid provider type' });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const restaurant = new Restaurant({ 
      name: name.trim(),
      passwordHash,
      providerType,
      description: description?.trim() || ''
    });

    await restaurant.save();
    
    // Don't send back the password hash
    const restaurantResponse = restaurant.toObject();
    delete restaurantResponse.passwordHash;
    
    res.status(201).json(restaurantResponse);
  } catch (err) {
    console.error('Error creating restaurant:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while creating restaurant' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    // Remove passwordHash if someone tries to update it directly
    if (updateData.passwordHash) {
      delete updateData.passwordHash;
    }

    if (updateData.providerType && !['university', 'student', 'admin'].includes(updateData.providerType)) {
      return res.status(400).json({ message: 'Invalid provider type' });
    }

    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-passwordHash');
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json(restaurant);
  } catch (err) {
    console.error('Error updating restaurant:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while updating restaurant' });
  }
});

router.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password is required and must be at least 8 characters' 
      });
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    restaurant.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await restaurant.save();

    res.json({ message: 'Restaurant password updated successfully' });
  } catch (err) {
    console.error('Error updating restaurant password:', err);
    res.status(500).json({ message: 'Server error while updating password' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    // Check if there are any food items associated with this restaurant
    const foodItemsCount = await FoodItem.countDocuments({ restaurant: id });
    if (foodItemsCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete restaurant with associated food items' 
      });
    }

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    console.error('Error deleting restaurant:', err);
    res.status(500).json({ message: 'Server error while deleting restaurant' });
  }
});

module.exports = router;