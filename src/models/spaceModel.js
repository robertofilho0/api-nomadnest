const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
    name: { type: String, require: true},   //NOME DO ESPAÇO
    location: { type: String, require: true}, //LOCALIZAÇÃO
    pricePerDay: { type: Number, require: true}, // PREÇO DA COMODIDADE POR DIA
    amenities: { type: [String], default: [] }, //LISTA DE COMODIDADES (WIFI, COFFEE, ETC)
    available: { type: Boolean, default: true } // DISPONIBILIDADE
});

module.exports = mongoose.model('Space', spaceSchema);