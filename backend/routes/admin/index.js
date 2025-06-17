const express = require('express');
const router = express.Router();
const adminMiddleware = require('../../middleware/adminMiddleware');

// Import all admin route files
const usersRouter = require('./users');
const restaurantsRouter = require('./restaurants');
const foodsRouter = require('./foods');
const ordersRouter = require('./orders');

// Protect all admin routes
router.use(adminMiddleware);

// Mount all admin routes
router.use('/users', usersRouter);
router.use('/restaurants', restaurantsRouter);
router.use('/foods', foodsRouter);
router.use('/orders', ordersRouter);

module.exports = router;