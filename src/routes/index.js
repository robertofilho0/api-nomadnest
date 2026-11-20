const { Router } = require('express');
const v = require('../middlewares/validate');
const { requireAuth, requireRole } = require('../middlewares/auth');
const s = require('../validators/schemas');
const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const spaces = require('../controllers/space.controller');
const bookings = require('../controllers/booking.controller');

const router = Router();
const admin = [requireAuth, requireRole('admin')];
const id = { params: s.idParams };

// Autenticação
router.post('/auth/register', v({ body: s.auth.register }), auth.register);
router.post('/auth/login', v({ body: s.auth.login }), auth.login);

// Usuários
router.get('/users/me', requireAuth, users.me);
router.patch('/users/me', requireAuth, v({ body: s.user.updateMe }), users.updateMe);
router.get('/users', admin, v({ query: s.user.list }), users.list);
router.get('/users/:id', admin, v(id), users.getById);
router.patch('/users/:id/role', admin, v({ ...id, body: s.user.changeRole }), users.changeRole);
router.delete('/users/:id', admin, v(id), users.remove);

// Espaços: consulta pública, gestão pelo admin
router.get('/spaces', v({ query: s.space.list }), spaces.list);
router.get('/spaces/:id', v(id), spaces.getById);
router.get(
  '/spaces/:id/availability',
  v({ ...id, query: s.space.availability }),
  spaces.availability,
);
router.post('/spaces', admin, v({ body: s.space.create }), spaces.create);
router.patch('/spaces/:id', admin, v({ ...id, body: s.space.update }), spaces.update);
router.delete('/spaces/:id', admin, v(id), spaces.remove);

// Reservas
router.post('/bookings', requireAuth, v({ body: s.booking.create }), bookings.create);
router.get('/bookings', requireAuth, v({ query: s.booking.list }), bookings.list);
router.get('/bookings/:id', requireAuth, v(id), bookings.getById);
router.patch(
  '/bookings/:id',
  requireAuth,
  v({ ...id, body: s.booking.reschedule }),
  bookings.reschedule,
);
router.post('/bookings/:id/cancel', requireAuth, v(id), bookings.cancel);
router.delete('/bookings/:id', admin, v(id), bookings.remove);

module.exports = router;
