const Receta = require('../../Models/Receta');

exports.crearReceta = async (req, res) => {
    try {
        const nuevaReceta = new Receta(req.body);
        await nuevaReceta.save();
        res.status(201).json({ mesaje: 'Receta Creada', receta: nuevaReceta});
    } catch (error) {
        res.status(500).josn({error: 'Surgio un error inesperado'});
    }
}

exports.obtenerRecetas = async (req, res) => {
    try {
        const recetas = await Receta.find();
        res.status(200).json(recetas);
    } catch (error) {
        res.status(500).json({ error: 'Hubo un error al obtener las recetas' });
    }
};