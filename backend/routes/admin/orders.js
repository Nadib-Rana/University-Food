const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../../models/Order');

router.get('/', async (req, res) => {
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

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating order ${id} to status: ${status}`);

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
        runValidators: true
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