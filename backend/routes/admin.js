const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');

// Protect all admin routes
router.use(adminMiddleware);

// --- USERS ---
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.role = role;
    await user.save();
    res.json({ message: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Admin can't delete self" });
    }
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- RESTAURANTS ---
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/restaurants', async (req, res) => {
  const { name, providerType, description } = req.body;
  
  if (!name || !providerType || !['university', 'student'].includes(providerType)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  try {
    const restaurant = new Restaurant({ 
      name, 
      providerType, 
      description: description || '' 
    });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/restaurants/:id', async (req, res) => {
  try {
    const updateData = req.body;
    
    if (updateData.providerType && !['university', 'student'].includes(updateData.providerType)) {
      return res.status(400).json({ message: 'Invalid providerType' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json({ message: 'Restaurant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- FOOD ITEMS ---
router.get('/foods', async (req, res) => {
  try {
    const foods = await FoodItem.find().populate('restaurant');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/foods', async (req, res) => {
  const { name, category, restaurant, price, description, image, stock, source } = req.body;

  // Validation
  if (!name || !category || !restaurant || price === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['morning', 'lunch', '24-7'].includes(category)) {
    return res.status(400).json({ message: 'Invalid category' });
  }

  try {
    // Check if restaurant exists
    const restaurantExists = await Restaurant.findById(restaurant);
    if (!restaurantExists) {
      return res.status(400).json({ message: 'Restaurant not found' });
    }

    const food = new FoodItem({
      name,
      category,
      image: image || '',
      stock: stock || 0,
      restaurant,
      price: parseFloat(price),
      source: source || 'GUB',
      description: description || ''
    });

    await food.save();
    const populatedFood = await FoodItem.findById(food._id).populate('restaurant');
    res.status(201).json(populatedFood);
  } catch (err) {
    console.error('Error creating food:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/foods/:id', async (req, res) => {
  try {
    const updates = req.body;

    if (updates.category && !['morning', 'lunch', '24-7'].includes(updates.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (updates.restaurant) {
      const restaurantExists = await Restaurant.findById(updates.restaurant);
      if (!restaurantExists) {
        return res.status(400).json({ message: 'Restaurant not found' });
      }
    }

    if (updates.price !== undefined) {
      updates.price = parseFloat(updates.price);
    }

    const food = await FoodItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('restaurant');

    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    res.json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/foods/:id', async (req, res) => {
  try {
    const food = await FoodItem.findByIdAndDelete(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ORDERS ---
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username role')
      .populate('items.foodItem');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/orders/:id', async (req, res) => {
  const { status } = req.body;
  
  if (!['processing', 'delivered'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = status;
    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;