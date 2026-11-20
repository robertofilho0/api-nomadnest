const User = require('../models/User');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');

async function findOrFail(id) {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound('Usuário não encontrado');
  return user;
}

exports.me = async (req, res) => res.json(await findOrFail(req.user.id));

exports.updateMe = async (req, res) => {
  const user = await findOrFail(req.user.id);
  user.set(req.body);
  await user.save();
  res.json(user);
};

exports.list = async (req, res) => {
  const { role, page, limit } = req.validated.query;
  const filter = role ? { role } : {};
  const [total, data] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } });
};

exports.getById = async (req, res) => res.json(await findOrFail(req.params.id));

exports.changeRole = async (req, res) => {
  if (req.params.id === req.user.id)
    throw AppError.badRequest('Você não pode alterar o próprio papel');
  const user = await findOrFail(req.params.id);
  user.role = req.body.role;
  await user.save();
  res.json(user);
};

exports.remove = async (req, res) => {
  if (req.params.id === req.user.id)
    throw AppError.badRequest('Você não pode remover a própria conta');
  const user = await findOrFail(req.params.id);
  await Promise.all([user.deleteOne(), Booking.deleteMany({ user: user._id })]);
  res.status(204).end();
};
