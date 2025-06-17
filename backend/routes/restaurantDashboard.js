// routes/restaurantDashboard.js
const express = require('express');
const router = express.Router();
const restaurantMiddleware = require('../middleware/restaurantMiddleware');
const mongoose = require('mongoose');

const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');

// Protect all restaurant routes
router.use(restaurantMiddleware);

// Get restaurant's orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({ 
      'items.foodItem.restaurant': req.restaurant._id 
    })
    .populate({
      path: 'user',
      select: 'username email'
    })
    .populate({
      path: 'items.foodItem',
      select: 'name price'
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}` 
      });
    }

    const order = await Order.findOneAndUpdate(
      { 
        _id: id,
        'items.foodItem.restaurant': req.restaurant._id 
      },
      { status },
      { new: true }
    )
    .populate('user', 'username email')
    .populate('items.foodItem', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    res.json({ 
      message: 'Order status updated successfully',
      order
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error while updating order status' });
  }
});

// Get restaurant's menu items
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await FoodItem.find({ 
      restaurant: req.restaurant._id 
    }).sort({ category: 1, name: 1 });

    res.json(menuItems);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ message: 'Server error while fetching menu items' });
  }
});

// Add new menu item
router.post('/menu', async (req, res) => {
  try {
    const { name, category, price, description, image, stock, source } = req.body;

    // Validation
    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, category and price are required' });
    }

    if (!['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const foodItem = new FoodItem({
      name: name.trim(),
      category,
      image: image?.trim() || '',
      stock: stock || 0,
      restaurant: req.restaurant._id,
      price: parseFloat(price),
      source: source || 'GUB',
      description: description?.trim() || ''
    });

    await foodItem.save();
    res.status(201).json(foodItem);
  } catch (err) {
    console.error('Error creating food item:', err);
    res.status(500).json({ message: 'Server error while creating food item' });
  }
});

// Update menu item
router.patch('/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    if (updates.category && !['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(updates.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (updates.price !== undefined) {
      if (isNaN(updates.price) || updates.price < 0) {
        return res.status(400).json({ message: 'Invalid price' });
      }
      updates.price = parseFloat(updates.price);
    }

    if (updates.stock !== undefined) {
      if (isNaN(updates.stock) || updates.stock < 0) {
        return res.status(400).json({ message: 'Invalid stock quantity' });
      }
      updates.stock = parseInt(updates.stock);
    }

    const foodItem = await FoodItem.findOneAndUpdate(
      { 
        _id: id,
        restaurant: req.restaurant._id 
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found or not authorized' });
    }

    res.json(foodItem);
  } catch (err) {
    console.error('Error updating food item:', err);
    res.status(500).json({ message: 'Server error while updating food item' });
  }
});

module.exports = router;