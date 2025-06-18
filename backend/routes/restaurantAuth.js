const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Restaurant login
router.post('/login', async (req, res) => {
  const { name, password } = req.body;
  console.log({name , password})

  // Basic validation
  if (!name || !password) {
    return res.status(400).json({ message: 'Please provide name and password' });
  }

  try {
    // Find restaurant by name
    const restaurant = await Restaurant.findOne({ name }).select('+passwordHash');
    if (!restaurant) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, restaurant.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: restaurant._id, name: restaurant.name, type: 'restaurant' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove passwordHash before sending response
    const restaurantWithoutPassword = restaurant.toObject();
    delete restaurantWithoutPassword.passwordHash;

    res.json({ token, restaurant: restaurantWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;