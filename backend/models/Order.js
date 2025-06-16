const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: String,
  location: String,
  paymentMethod: String,
  transactionId: String,
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  totalAmount: Number,
  items: [
    {
      foodItem: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'FoodItem' 
      },
      quantity: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);