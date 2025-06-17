const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FoodItem = require('../../models/FoodItem');
const Restaurant = require('../../models/Restaurant');
const Order = require('../../models/Order');

// Middleware to verify admin authentication
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  next();
};

// Get all food items
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const foods = await FoodItem.find().populate('restaurant', 'name providerType');
    res.json(foods);
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ message: 'Server error while fetching food items' });
  }
});

// Create new food item
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { name, category, restaurant, price, description, image, stock, source } = req.body;

    // Enhanced validation
    if (!name || !category || !restaurant || price === undefined || price === null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'Price must be a positive number' });
    }

    const restaurantExists = await Restaurant.findById(restaurant);
    if (!restaurantExists) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const food = new FoodItem({
      name: name.trim(),
      category,
      image: image?.trim() || '',
      stock: stock || 0,
      restaurant,
      price: parseFloat(price),
      source: source || 'GUB',
      description: description?.trim() || ''
    });

    await food.save();
    const populatedFood = await FoodItem.findById(food._id)
      .populate('restaurant', 'name providerType');
      
    res.status(201).json(populatedFood);
  } catch (err) {
    console.error('Error creating food item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while creating food item' });
  }
});

// Update food item
router.patch('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    // Validate updates
    if (updates.category && !['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(updates.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (updates.restaurant) {
      if (!mongoose.Types.ObjectId.isValid(updates.restaurant)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }
      const restaurantExists = await Restaurant.findById(updates.restaurant);
      if (!restaurantExists) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
    }

    if (updates.price !== undefined) {
      if (isNaN(updates.price) || updates.price < 0) {
        return res.status(400).json({ message: 'Price must be a positive number' });
      }
      updates.price = parseFloat(updates.price);
    }

    // Trim string fields
    ['name', 'description', 'image'].forEach(field => {
      if (updates[field]) {
        updates[field] = updates[field].trim();
      }
    });

    const food = await FoodItem.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('restaurant', 'name providerType');

    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json(food);
  } catch (err) {
    console.error('Error updating food item:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error while updating food item' });
  }
});

// Delete food item
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    // Check for existing orders
    const orderCount = await Order.countDocuments({ 'items.foodItem': id });
    if (orderCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete food item referenced in orders' 
      });
    }

    const food = await FoodItem.findByIdAndDelete(id);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json({ message: 'Food item deleted successfully' });
  } catch (err) {
    console.error('Error deleting food item:', err);
    res.status(500).json({ message: 'Server error while deleting food item' });
  }
});

module.exports = router;