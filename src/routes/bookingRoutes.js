const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const bookingController = require('../controllers/bookingController');


// Rotas protegidas: criar/alterar/excluir exigem token
router.post('/bookings', requireAuth, bookingController.createBooking);
router.get('/bookings', requireAuth, bookingController.getAllBookings);
router.get('/bookings/:id', requireAuth, bookingController.getBookingById);
router.put('/bookings/:id', requireAuth, bookingController.updateBooking);
router.delete('/bookings/:id', requireAuth, bookingController.deleteBooking);


module.exports = router;