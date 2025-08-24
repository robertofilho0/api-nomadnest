const express = require('express');
const router = express.Router();
const spaceController = require('../controllers/spaceController');
const { requireAuth } = require('../middlewares/auth');

router.post('/spaces',requireAuth,  spaceController.createSpace);
router.get('/spaces',requireAuth,  spaceController.getAllSpaces);
router.get('/spaces/:id',requireAuth,  spaceController.getSpaceById);
router.put('/spaces/:id',requireAuth,  spaceController.updateSpace);
router.delete('/spaces/:id',requireAuth,  spaceController.deleteSpace);

module.exports = router;