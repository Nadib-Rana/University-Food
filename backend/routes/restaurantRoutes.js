const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');

// Protect all routes
router.use(authMiddleware);

// Get restaurant details (owned by current user)
router.get('/my-restaurant', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all food items for my restaurant
router.get('/food-items', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    const foodItems = await FoodItem.find({ restaurant: restaurant._id });
    res.json(foodItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create food item
router.post('/food-items', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const { name, category, price, description, image, stock, source } = req.body;
    
    const foodItem = new FoodItem({
      name,
      category,
      price,
      description,
      image,
      stock,
      source,
      restaurant: restaurant._id
    });

    await foodItem.save();
    res.status(201).json(foodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update food item
router.patch('/food-items/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const foodItem = await FoodItem.findOne({
      _id: req.params.id,
      restaurant: restaurant._id
    });

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    Object.assign(foodItem, req.body);
    await foodItem.save();
    res.json(foodItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get orders for my restaurant
router.get('/orders', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const orders = await Order.find({ 
      'items.foodItem': { 
        $in: await FoodItem.find({ restaurant: restaurant._id }).distinct('_id') 
      } 
    })
    .populate('user', 'username')
    .populate('items.foodItem');

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    
    const order = await Order.findOneAndUpdate(
      { 
        _id: req.params.id,
        'items.foodItem': { 
          $in: await FoodItem.find({ restaurant: restaurant._id }).distinct('_id') 
        }
      },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;