const User = require('../models/userModel');

const createUser = async (data) => {
    const user = new User(data);
    return await user.save(); // ✅ salvar a instância
};

const getAllUsers = async () => {
    return await User.find(); // retorna array
};

const getUserById = async (id) => {
    return await User.findById(id); // retorna objeto ou null
};

const updateUser = async (id, data) => {
    return await User.findByIdAndUpdate(id, data, { new: true });
};

const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};
