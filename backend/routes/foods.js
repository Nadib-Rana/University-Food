// backend/routes/foods.js
const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');

// Get all foods with filtering
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category && ['morning', 'lunch', '24-7'].includes(category)) {
    filter.category = category;
  }
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  try {
    const foods = await FoodItem.find(filter).populate('restaurant');
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new food item
router.post('/', async (req, res) => {
  const { name, category, image, restaurant, price, description, stock, source } = req.body;
  
  if (!name || !category || !image || !restaurant || !price || !source) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  if (!['morning', 'lunch', '24-7'].includes(category)) {
    return res.status(400).json({ message: 'Invalid category' });
  }
  
  if (!['GUB', 'STU'].includes(source)) {
    return res.status(400).json({ message: 'Invalid source' });
  }

  try {
    const food = new FoodItem({
      name,
      category,
      image,
      restaurant,
      price,
      description,
      stock: stock || 0,
      source
    });
    await food.save();
    res.status(201).json(food);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update food item
router.patch('/:id', async (req, res) => {
  try {
    const { name, category, image, restaurant, price, description, stock, source } = req.body;
    const food = await FoodItem.findById(req.params.id);
    
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    if (name) food.name = name;
    if (category) food.category = category;
    if (image) food.image = image;
    if (restaurant) food.restaurant = restaurant;
    if (price) food.price = price;
    if (description) food.description = description;
    if (stock !== undefined) food.stock = stock;
    if (source) food.source = source;

    await food.save();
    res.json(food);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;