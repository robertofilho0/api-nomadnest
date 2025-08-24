const Space = require('../models/spaceModel');
const mongoose = require('mongoose');

const createSpace = async (data) => {
    const space = new Space(data);
    return await space.save();
};

const getAllSpaces = async () => {
    return await Space.find();
};

const getSpaceById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null; // valida ID
    return await Space.findById(id); // ✅ passar o id
};

const updateSpace = async (id, data) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Space.findByIdAndUpdate(id, data, { new: true });
};

const deleteSpace = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Space.findByIdAndDelete(id);
};

module.exports = {
    createSpace,
    getAllSpaces,
    getSpaceById,
    updateSpace,
    deleteSpace
};
