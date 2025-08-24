const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const register = async ({ name, age, email, password }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new Error('Email já cadastrado');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, age, email, passwordHash });
  return user;
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Credenciais inválidas');
  const ok = await user.comparePassword(password);
  if (!ok) throw new Error('Credenciais inválidas');

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
  return { user, token };
};

module.exports = { register, login };
