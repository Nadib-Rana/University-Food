// //from: University-Food/backend/routes/restaurants.js

// const express = require('express');
// const router = express.Router();
// const Restaurant = require('../models/Restaurant');

// // Get all restaurants
// router.get('/', async (req, res) => {
//   try {
//     const restaurants = await Restaurant.find();
//     res.json(restaurants);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Add a new restaurant (no auth here, can be extended later)
// router.post('/', async (req, res) => {
//   const { name, passwordHash, providerType, description } = req.body;

//   // Validate input
//   const validTypes = ['university', 'student', 'admin'];
//   if (!name || !passwordHash || !providerType || !validTypes.includes(providerType)) {
//     return res.status(400).json({ message: 'Invalid data' });
//   }

//   try {
//     const restaurant = new Restaurant({
//       name: name.trim(),
//       passwordHash,
//       providerType,
//       description: description?.trim() || ''
//     });

//     await restaurant.save();
//     res.status(201).json(restaurant);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;