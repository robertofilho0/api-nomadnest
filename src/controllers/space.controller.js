const Space = require('../models/Space');
const Booking = require('../models/Booking');
const bookingService = require('../services/booking.service');
const AppError = require('../utils/AppError');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function findOrFail(id) {
  const space = await Space.findById(id);
  if (!space) throw AppError.notFound('Espaço não encontrado');
  return space;
}

exports.list = async (req, res) => {
  const q = req.validated.query;
  const filter = { available: true };

  if (q.city) filter.city = { $regex: `^${escapeRegex(q.city)}$`, $options: 'i' };
  if (q.search) filter.name = { $regex: escapeRegex(q.search), $options: 'i' };
  if (q.amenities?.length) filter.amenities = { $all: q.amenities };
  if (q.minCapacity) filter.capacity = { $gte: q.minCapacity };
  if (q.maxPrice !== undefined) filter.pricePerDay = { $lte: q.maxPrice };
  if (q.from) filter._id = { $nin: await bookingService.busySpaceIds(q.from, q.to) };

  const [total, data] = await Promise.all([
    Space.countDocuments(filter),
    Space.find(filter)
      .sort({ [q.sortBy]: q.order === 'asc' ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
  ]);

  res.json({
    data,
    meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) || 1 },
  });
};

exports.getById = async (req, res) => res.json(await findOrFail(req.params.id));

exports.availability = async (req, res) => {
  const space = await findOrFail(req.params.id);
  const { from, to } = req.validated.query;
  const occupied = await bookingService.occupied(space._id, from, to);
  res.json({
    spaceId: space.id,
    from,
    to,
    available: space.available && occupied.length === 0,
    occupied,
  });
};

exports.create = async (req, res) => {
  res.status(201).json(await Space.create(req.body));
};

exports.update = async (req, res) => {
  const space = await findOrFail(req.params.id);
  space.set(req.body);
  await space.save();
  res.json(space);
};

exports.remove = async (req, res) => {
  const space = await findOrFail(req.params.id);
  const upcoming = await Booking.exists({
    space: space._id,
    status: 'confirmed',
    endDate: { $gt: new Date() },
  });
  if (upcoming) {
    throw AppError.conflict(
      'O espaço possui reservas futuras. Desative-o (available: false) ou cancele as reservas',
    );
  }
  await space.deleteOne();
  res.status(204).end();
};
