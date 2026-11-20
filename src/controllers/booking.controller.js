const Booking = require('../models/Booking');
const bookingService = require('../services/booking.service');
const AppError = require('../utils/AppError');

const populate = [
  { path: 'space', select: 'name city address pricePerDay' },
  { path: 'user', select: 'name email' },
];

/** Busca a reserva garantindo que o usuário é o dono (ou admin). */
async function findAllowed(id, user) {
  const booking = await Booking.findById(id);
  if (!booking) throw AppError.notFound('Reserva não encontrada');
  if (user.role !== 'admin' && String(booking.user) !== user.id) {
    throw AppError.notFound('Reserva não encontrada'); // não revela reservas de outras pessoas
  }
  return booking;
}

exports.create = async (req, res) => {
  const booking = await bookingService.create({ userId: req.user.id, ...req.body });
  res.status(201).json(await booking.populate(populate));
};

exports.list = async (req, res) => {
  const { status, when, spaceId, page, limit } = req.validated.query;
  const filter = req.user.role === 'admin' ? {} : { user: req.user.id };
  if (status) filter.status = status;
  if (spaceId) filter.space = spaceId;
  if (when === 'upcoming') filter.endDate = { $gt: new Date() };
  if (when === 'past') filter.endDate = { $lte: new Date() };

  const [total, data] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate(populate)
      .sort({ startDate: when === 'past' ? -1 : 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } });
};

exports.getById = async (req, res) => {
  const booking = await findAllowed(req.params.id, req.user);
  res.json(await booking.populate(populate));
};

exports.reschedule = async (req, res) => {
  const booking = await findAllowed(req.params.id, req.user);
  await bookingService.reschedule(booking, req.body);
  res.json(await booking.populate(populate));
};

exports.cancel = async (req, res) => {
  const booking = await findAllowed(req.params.id, req.user);
  await bookingService.cancel(booking);
  res.json(await booking.populate(populate));
};

exports.remove = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw AppError.notFound('Reserva não encontrada');
  await booking.deleteOne();
  res.status(204).end();
};
