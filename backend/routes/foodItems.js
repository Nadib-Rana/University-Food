// University-Food/backend/routes/foodItems.js (Restaurant-specific)
const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');
const { restaurantAuth } = require('../middleware/auth');

// Get all food items for current restaurant
router.get('/', restaurantAuth, async (req, res) => {
  try {
    const foodItems = await FoodItem.find({ restaurant: req.restaurant._id });
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new food item (only for current restaurant)
router.post('/', restaurantAuth, async (req, res) => {
  const { name, price, description, image, category, availability } = req.body;
  
  try {
    const foodItem = new FoodItem({
      name,
      price,
      description,
      image,
      category,
      availability,
      restaurant: req.restaurant._id
    });

    await foodItem.save();
    res.status(201).json(foodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update food item (only for current restaurant)
router.patch('/:id', restaurantAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const foodItem = await FoodItem.findOneAndUpdate(
      { _id: id, restaurant: req.restaurant._id },
      req.body,
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

// Delete food item (only for current restaurant)
router.delete('/:id', restaurantAuth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const foodItem = await FoodItem.findOneAndDelete({
      _id: id,
      restaurant: req.restaurant._id
    });
    
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;