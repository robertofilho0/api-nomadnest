const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const STATUS = ['confirmed', 'cancelled'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STATUS, default: 'confirmed' },
    notes: { type: String, trim: true, maxlength: 500 },
    cancelledAt: { type: Date },
  },
  { timestamps: true, toJSON },
);

// Consulta de conflitos: reservas ativas do espaço que cruzam um período
bookingSchema.index({ space: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.STATUS = STATUS;
