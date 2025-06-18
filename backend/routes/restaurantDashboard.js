const express = require('express');
const router = express.Router();
const restaurantAuth = require('../middleware/restaurantMiddleware');
const FoodItem = require('../models/FoodItem');

// Apply authentication middleware to all dashboard routes
router.use(restaurantAuth);

// Get all food items for the current restaurant
router.get('/fooditems', async (req, res) => {
  try {
    const foodItems = await FoodItem.find({ restaurant: req.restaurant._id });
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new food item
router.post('/fooditems', async (req, res) => {
  const { name, price, description, image, category, availability } = req.body;
  
  // Validate input
  if (!name || !price) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  try {
    const foodItem = new FoodItem({
      name,
      price,
      description: description || '',
      image: image || '',
      category: category || '',
      availability: availability !== undefined ? availability : true,
      restaurant: req.restaurant._id
    });

    await foodItem.save();
    res.status(201).json(foodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update food item availability
router.patch('/fooditems/:id/availability', async (req, res) => {
  try {
    const foodItem = await FoodItem.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant._id },
      { availability: req.body.availability },
      { new: true }
    );
    
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    res.json(foodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;