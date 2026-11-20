const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middlewares/auth');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

exports.register = async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw AppError.conflict('E-mail já cadastrado');
  const user = await User.create(req.body);
  res.status(201).json({ token: signToken(user), expiresIn: env.JWT_EXPIRES_IN, user });
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  const ok = await bcrypt.compare(req.body.password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw AppError.unauthorized('Credenciais inválidas');
  res.json({ token: signToken(user), expiresIn: env.JWT_EXPIRES_IN, user });
};
