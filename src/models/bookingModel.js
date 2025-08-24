const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    space : { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true},
    startDate: { type: Date, required: true},
    endDate: { type: Date, required: true},
    status: {type: String, enum: ['Pending', 'confirmed', 'cancelled'], default: 'confirmed' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);