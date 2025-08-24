const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if(!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token ausente' });
    }
    const token = header.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.sub, role: payload.role };
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido'});
    }
};

module.exports = { requireAuth };