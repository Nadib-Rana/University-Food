// middleware/restaurantMiddleware.js
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const restaurant = await Restaurant.findById(decoded.id);
    
    if (!restaurant) {
      return res.status(401).json({ message: 'Restaurant not found' });
    }

    req.restaurant = restaurant;
    next();
  } catch (err) {
    console.error('Restaurant authentication error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};