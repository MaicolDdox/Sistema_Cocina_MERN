const mongoose = require('mongoose');
const Receta = require('../../Models/Receta');

const CAMPOS_RECETA_PERMITIDOS = ['titulo', 'tiempo', 'ingredientes', 'pasos'];
const CAMPOS_INGREDIENTE_PERMITIDOS = ['nombre', 'cantidad', 'unidad'];

const esObjetoPlano = (valor) => (
    valor !== null
    && typeof valor === 'object'
    && !Array.isArray(valor)
);

const esObjectIdValido = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizarErroresMongoose = (error) => {
    if (error.name !== 'ValidationError') {
        return null;
    }

    const detalles = Object.values(error.errors).map((detalle) => detalle.message);

    return {
        error: 'Datos de receta invalidos',
        detalles
    };
};

const validarIngredientes = (ingredientes) => {
    if (!Array.isArray(ingredientes)) {
        return 'El campo ingredientes debe ser un arreglo';
    }

    for (const ingrediente of ingredientes) {
        if (!esObjetoPlano(ingrediente)) {
            return 'Cada ingrediente debe ser un objeto';
        }

        const camposInvalidos = Object.keys(ingrediente)
            .filter((campo) => !CAMPOS_INGREDIENTE_PERMITIDOS.includes(campo));

        if (camposInvalidos.length > 0) {
            return `Campos invalidos en ingredientes: ${camposInvalidos.join(', ')}`;
        }

        if (
            Object.prototype.hasOwnProperty.call(ingrediente, 'nombre')
            && typeof ingrediente.nombre !== 'string'
        ) {
            return 'El nombre de cada ingrediente debe ser texto';
        }

        if (
            Object.prototype.hasOwnProperty.call(ingrediente, 'cantidad')
            && (typeof ingrediente.cantidad !== 'number' || Number.isNaN(ingrediente.cantidad))
        ) {
            return 'La cantidad de cada ingrediente debe ser numerica';
        }

        if (
            Object.prototype.hasOwnProperty.call(ingrediente, 'unidad')
            && typeof ingrediente.unidad !== 'string'
        ) {
            return 'La unidad de cada ingrediente debe ser texto';
        }
    }

    return null;
};

const validarPasos = (pasos) => {
    if (!Array.isArray(pasos)) {
        return 'El campo pasos debe ser un arreglo';
    }

    if (!pasos.every((paso) => typeof paso === 'string')) {
        return 'Cada paso debe ser texto';
    }

    return null;
};

const validarPayloadReceta = (payload, esReemplazo = false) => {
    if (!esObjetoPlano(payload)) {
        return { error: 'El cuerpo de la solicitud debe ser un objeto JSON valido' };
    }

    const llavesPayload = Object.keys(payload);
    if (llavesPayload.length === 0) {
        if (esReemplazo) {
            return { error: 'Para reemplazar la receta debes enviar al menos titulo y tiempo' };
        }

        return { error: 'Debes enviar al menos un campo para actualizar' };
    }

    const camposInvalidos = llavesPayload
        .filter((campo) => !CAMPOS_RECETA_PERMITIDOS.includes(campo));

    if (camposInvalidos.length > 0) {
        return { error: `Campos no permitidos: ${camposInvalidos.join(', ')}` };
    }

    if (esReemplazo) {
        const faltantes = ['titulo', 'tiempo'].filter(
            (campo) => !Object.prototype.hasOwnProperty.call(payload, campo)
        );

        if (faltantes.length > 0) {
            return { error: `Faltan campos obligatorios: ${faltantes.join(', ')}` };
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(payload, 'titulo')
        && typeof payload.titulo !== 'string'
    ) {
        return { error: 'El campo titulo debe ser texto' };
    }

    if (
        Object.prototype.hasOwnProperty.call(payload, 'tiempo')
        && typeof payload.tiempo !== 'string'
    ) {
        return { error: 'El campo tiempo debe ser texto' };
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'ingredientes')) {
        const errorIngredientes = validarIngredientes(payload.ingredientes);
        if (errorIngredientes) {
            return { error: errorIngredientes };
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'pasos')) {
        const errorPasos = validarPasos(payload.pasos);
        if (errorPasos) {
            return { error: errorPasos };
        }
    }

    const payloadSaneado = {};
    for (const campo of llavesPayload) {
        payloadSaneado[campo] = payload[campo];
    }

    return { payloadSaneado };
};

//Funcion Index
exports.obtenerRecetas = async (req, res) => {
    try {
        const recetas = await Receta.find();
        res.status(200).json(recetas);
    } catch (error) {
        res.status(500).json({ error: 'Hubo un error al obtener las recetas' });
    }
};

//Funcion Create
exports.crearReceta = async (req, res) => {
    try {
        const nuevaReceta = new Receta(req.body);
        await nuevaReceta.save();
        res.status(201).json({ mensaje: 'Receta Creada', receta: nuevaReceta});
    } catch (error) {
        res.status(500).json({error: 'Surgio un error inesperado'});
    }
}

//Funcion Update
exports.updateReceta = async (req, res) => {
    const { id } = req.params;

    if (!esObjectIdValido(id)) {
        return res.status(400).json({ error: 'El id de la receta no es valido' });
    }

    const { error: errorValidacion, payloadSaneado } = validarPayloadReceta(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const recetaActualizada = await Receta.findByIdAndUpdate(
            id,
            payloadSaneado,
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        );

        if (!recetaActualizada) {
            return res.status(404).json({ error: 'Receta no encontrada' });
        }

        return res.status(200).json({
            mensaje: 'Receta actualizada',
            receta: recetaActualizada
        });
    } catch (error) {
        const errorMongoose = normalizarErroresMongoose(error);
        if (errorMongoose) {
            return res.status(400).json(errorMongoose);
        }

        return res.status(500).json({ error: 'Surgio un error inesperado' });
    }
};

//Funcion Replace
exports.replaceReceta = async (req, res) => {
    const { id } = req.params;

    if (!esObjectIdValido(id)) {
        return res.status(400).json({ error: 'El id de la receta no es valido' });
    }

    const { error: errorValidacion, payloadSaneado } = validarPayloadReceta(req.body, true);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const recetaReemplazada = await Receta.findByIdAndUpdate(
            id,
            payloadSaneado,
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        );

        if (!recetaReemplazada) {
            return res.status(404).json({ error: 'Receta no encontrada' });
        }

        return res.status(200).json({
            mensaje: 'Receta reemplazada',
            receta: recetaReemplazada
        });
    } catch (error) {
        const errorMongoose = normalizarErroresMongoose(error);
        if (errorMongoose) {
            return res.status(400).json(errorMongoose);
        }

        return res.status(500).json({ error: 'Surgio un error inesperado' });
    }
};

//Eliminar Receta
exports.destroyReceta = async (req, res) => {
    const { id } = req.params;

    if (!esObjectIdValido(id)) {
        return res.status(400).json({ error: 'El id de la receta no es valido' });
    }

    try {
        const recetaEliminada = await Receta.findByIdAndDelete(id);

        if (!recetaEliminada) {
            return res.status(404).json({ error: 'Receta no encontrada' });
        }

        return res.status(200).json({
            mensaje: 'Receta eliminada',
            receta: recetaEliminada
        });
    } catch (error) {
        return res.status(500).json({ error: 'Surgio un error inesperado' });
    }
};
