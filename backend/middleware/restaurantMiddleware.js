const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

const restaurantAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find restaurant by ID
    const restaurant = await Restaurant.findById(decoded.id);
    if (!restaurant) {
      return res.status(401).json({ message: 'Restaurant not found' });
    }

    // Attach restaurant to request
    req.restaurant = restaurant;
    next();
  } catch (err) {
    console.error('Restaurant authentication error:', err);
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

module.exports = restaurantAuth;