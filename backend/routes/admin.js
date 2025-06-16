const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');

// Protect all admin routes
router.use(adminMiddleware);

// --- USERS ---
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash -refreshToken');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (id === req.user._id.toString() && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot remove admin role from yourself' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully', user });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server error while updating user role' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (id === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// --- RESTAURANTS ---
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().select('-passwordHash');
    res.json(restaurants);
  } catch (err) {
    console.error('Error fetching restaurants:', err);
    res.status(500).json({ message: 'Server error while fetching restaurants' });
  }
});

router.post('/restaurants', async (req, res) => {
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

router.patch('/restaurants/:id', async (req, res) => {
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

router.patch('/restaurants/:id/password', async (req, res) => {
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

router.delete('/restaurants/:id', async (req, res) => {
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

// --- FOOD ITEMS ---
router.get('/foods', async (req, res) => {
  try {
    const foods = await FoodItem.find().populate('restaurant', 'name providerType');
    res.json(foods);
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ message: 'Server error while fetching food items' });
  }
});

router.post('/foods', async (req, res) => {
  try {
    const { name, category, restaurant, price, description, image, stock, source } = req.body;

    // Validation
    if (!name || !category || !restaurant || price === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurant)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    // Check if restaurant exists
    const restaurantExists = await Restaurant.findById(restaurant);
    if (!restaurantExists) {
      return res.status(400).json({ message: 'Restaurant not found' });
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

router.patch('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    if (updates.category && !['morning', 'lunch', 'dinner', 'snacks', '24-7'].includes(updates.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (updates.restaurant) {
      if (!mongoose.Types.ObjectId.isValid(updates.restaurant)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }
      const restaurantExists = await Restaurant.findById(updates.restaurant);
      if (!restaurantExists) {
        return res.status(400).json({ message: 'Restaurant not found' });
      }
    }

    if (updates.price !== undefined) {
      if (isNaN(updates.price) || updates.price < 0) {
        return res.status(400).json({ message: 'Invalid price' });
      }
      updates.price = parseFloat(updates.price);
    }

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    if (updates.description) {
      updates.description = updates.description.trim();
    }

    if (updates.image) {
      updates.image = updates.image.trim();
    }

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

router.delete('/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    // Check if this food item is referenced in any orders
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


// --- ORDERS ---
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'user',
        select: 'username email role'
      })
      .populate({
        path: 'items.foodItem',
        select: 'name price restaurant',
        populate: {
          path: 'restaurant',
          select: 'name providerType'
        }
      })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error while fetching orders' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating order ${id} to status: ${status}`); // Debug log

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid order ID format:', id);
      return res.status(400).json({ message: 'Invalid order ID format' });
    }

    // Define valid statuses
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    
    // Validate status
    if (!status || !validStatuses.includes(status)) {
      console.error('Invalid status:', status);
      return res.status(400).json({ 
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}` 
      });
    }

    // Find and update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { 
        new: true,
        runValidators: true // Ensure schema validation runs
      }
    )
    .populate({
      path: 'user',
      select: 'username email role'
    })
    .populate({
      path: 'items.foodItem',
      select: 'name price restaurant',
      populate: {
        path: 'restaurant',
        select: 'name providerType'
      }
    });

    // Handle order not found
    if (!updatedOrder) {
      console.error('Order not found:', id);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Successfully updated order:', updatedOrder._id);
    res.json({ 
      message: 'Order status updated successfully',
      order: updatedOrder 
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: `Validation error: ${err.message}` 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: `Invalid ID format: ${err.value}`
      });
    }
    
    res.status(500).json({ message: 'Server error while updating order status' });
  }
});

module.exports = router;