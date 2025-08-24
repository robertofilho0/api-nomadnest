const bookingService = require('../services/bookingService');


const createBooking = async (req, res) => {
try {
const { spaceId, startDate, endDate } = req.body;
if (!spaceId || !startDate || !endDate) {
return res.status(400).json({ message: 'Campos obrigatórios: spaceId, startDate, endDate' });
}
const booking = await bookingService.createBooking({
userId: req.user.id, // do token
spaceId,
startDate,
endDate
});
res.status(201).json(booking);
} catch (err) {
res.status(400).json({ message: err.message });
}
};


const getAllBookings = async (req, res) => {
try {
const list = await bookingService.getAllBookings();
res.json(list);
} catch (err) {
res.status(500).json({ message: err.message });
}
};


const getBookingById = async (req, res) => {
try {
const booking = await bookingService.getBookingById(req.params.id);
if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });
res.json(booking);
} catch (err) {
res.status(500).json({ message: err.message });
}
};


const updateBooking = async (req, res) => {
try {
const booking = await bookingService.updateBooking(req.params.id, req.body);
if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });
res.json(booking);
} catch (err) {
res.status(400).json({ message: err.message });
}
};


const deleteBooking = async (req, res) => {
try {
const booking = await bookingService.deleteBooking(req.params.id);
if (!booking) return res.status(404).json({ message: 'Reserva não encontrada' });
res.status(204).send();
} catch (err) {
res.status(500).json({ message: err.message });
}
};


module.exports = { createBooking, getAllBookings, getBookingById, updateBooking, deleteBooking };