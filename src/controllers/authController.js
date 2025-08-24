const authService = require('../services/authService');

const register = async (req, res) => {
    try {
        const { name, age, email, password } = req.body;
        if(!name || !age || !email || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios: nome, idade, email e senha'});
        }
        const user = await authService.register({ name, age, email, password});
        res.status(201).json({ _id: user._id, name: user.name, email: user.email});
    } catch (err) {
        res.status(400).json({ message: err.message});
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Campos obrigatórios email e senha'});
        }
        const { user, token } = await authService.login({ email, password });
        res.json({
            token,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role }
        })
    } catch (err){
          res.status(401).json({ message: err.message});
    }
};

module.exports = { register, login};