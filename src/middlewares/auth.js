const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(AppError.unauthorized('Token não fornecido'));
  const payload = jwt.verify(token, env.JWT_SECRET);
  req.user = { id: payload.sub, role: payload.role };
  return next();
}

const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(AppError.forbidden('Você não tem permissão para acessar este recurso'));

module.exports = { signToken, requireAuth, requireRole };
