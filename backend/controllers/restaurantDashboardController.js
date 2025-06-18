const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');

const getFoods = async (req, res) => {
  try {
    if (req.restaurant._id.toString() !== req.params.restaurantId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const foods = await FoodItem.find({ restaurantId: req.params.restaurantId })
      .populate('restaurantId', 'name');
    res.json(foods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch food items' });
  }
};

const createFood = async (req, res) => {
  const { name, category, image, price, description, stock, source } = req.body;

  try {
    const food = new FoodItem({
      name,
      category,
      image,
      restaurantId: req.restaurant._id,
      price,
      description,
      stock,
      source
    });

    await food.save();
    res.status(201).json(food);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create food item' });
  }
};

const updateFood = async (req, res) => {
  const { id } = req.params;
  const { name, category, image, price, description, stock, source } = req.body;

  try {
    const food = await FoodItem.findById(id);
    if (!food) return res.status(404).json({ message: 'Food item not found' });
    
    if (food.restaurantId.toString() !== req.restaurant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    food.name = name || food.name;
    food.category = category || food.category;
    food.image = image || food.image;
    food.price = price || food.price;
    food.description = description || food.description;
    food.stock = stock || food.stock;
    food.source = source || food.source;

    await food.save();
    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update food item' });
  }
};

const deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    const food = await FoodItem.findById(id);
    if (!food) return res.status(404).json({ message: 'Food item not found' });
    
    if (food.restaurantId.toString() !== req.restaurant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await FoodItem.deleteOne({ _id: id });
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete food item' });
  }
};

const getOrders = async (req, res) => {
  try {
    if (req.restaurant._id.toString() !== req.params.restaurantId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const orders = await Order.find({ restaurantId: req.params.restaurantId })
      .populate('user', 'username role')
      .populate('items.foodItem', 'name price');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (order.restaurantId.toString() !== req.restaurant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!['processing', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update order status' });
  }
};

module.exports = {
  getFoods,
  createFood,
  updateFood,
  deleteFood,
  getOrders,
  updateOrderStatus
};