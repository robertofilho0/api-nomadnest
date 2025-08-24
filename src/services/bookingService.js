const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Space = require('../models/spaceModel');

const hasOverlap = async (spaceId, start, end) => {
    //Verificação de reserva (intervalo intersecta?)
    return await Booking.exists({
        space: spaceId,
        status: { $ne: 'cancelled'},
        $or: [
            { startDate: { $lt: end}, endDate: { $gt: start }}, //===Utilização de overlap===
        ]
    });
};

const createBooking = async ({ userId, spaceId, startDate, endDate}) => {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(spaceId)) {
        throw new Error('IDs inválidos');
    }
    const space = await Space.findById(spaceId);
    if(!space) throw new Error('Espaço não encontrado');
    if (new Date(startDate) >= new Date(endDate)) throw new Error('Período inválido');

    const overlap = await hasOverlap(spaceId, new Date(startDate), new Date(endDate));
    if (overlap) throw new Error('Espaço indisponível para o período selecionado');

    const booking = await Booking.create({
        user: userId,
        space: spaceId,
        startDate,
        endDate,
        status: 'confirmed'
    });
    return booking;
};

const getAllBookings = async () => Booking.find().populate('user', 'name email').populate('space', 'name location');
const getBookingById = async (id) => Booking.findById(id).populate('user', 'name email').populate('space', 'name location');
const updateBooking = async (id, data) => Booking.findByIdAndUpdate(id, data, { new: true});
const deleteBooking = async (id) => Booking.findByIdAndDelete(id);

module.exports = {
    createBooking,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking
};