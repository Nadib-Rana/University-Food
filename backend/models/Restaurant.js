const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  providerType: { 
    type: String, 
    enum: ['university', 'student', 'admin'], 
    required: true 
  },
  description: { type: String },
  staff: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['manager', 'chef', 'cashier'], required: true }
  }]
}, { timestamps: true });

// Add method to verify password
restaurantSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('Restaurant', restaurantSchema);