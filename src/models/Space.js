const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const AMENITIES = [
  'wifi',
  'cafe',
  'ar_condicionado',
  'estacionamento',
  'sala_reuniao',
  'impressora',
  'cozinha',
  'armarios',
  'acessibilidade',
  'pet_friendly',
];

const spaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000 },
    city: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    pricePerDay: { type: Number, required: true, min: 0 },
    amenities: { type: [{ type: String, enum: AMENITIES }], default: [] },
    available: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON },
);

module.exports = mongoose.model('Space', spaceSchema);
module.exports.AMENITIES = AMENITIES;
