const { get } = require('mongoose');
const spaceService = require('../services/spaceService');

const createSpace = async (req, res) => {
    try {
        const { name, location, pricePerDay } = req.body;

        // validação correta
        if (!name || !location || !pricePerDay) {
            return res.status(400).json({ message: "Campos obrigatórios: name, location e pricePerDay" });
        }

        const space = await spaceService.createSpace(req.body);
        res.status(201).json(space);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllSpaces = async (req, res) => {
    try {
        const spaces = await spaceService.getAllSpaces();
        res.json(spaces);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSpaceById = async (req, res) => {
    try {
        const space = await spaceService.getSpaceById(req.params.id);
        if(!space) return res.status(404).json({ message: "Espaço não encontrado"});
        res.json(space);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSpace = async (req, res) => {
    try {
        const space = await spaceService.updateSpace(req.params.id, req.body);
        if (!space) return res.status(404).json({ message: "Espaço não encontrado." });
        res.json(space);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSpace = async (req, res) => {
    try {
        const space = await spaceService.deleteSpace(req.params.id);
        if (!space) return res.status(404).json({ message: "Espaço não encontrado." });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createSpace,
    getAllSpaces,
    getSpaceById,
    updateSpace,
    deleteSpace
};
