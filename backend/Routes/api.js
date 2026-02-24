const express = require('express');
const router = express.Router();
const recetaController = require('../App/Http/Controllers/recetaController');

router.get('/', recetaController.obtenerRecetas);
router.post('/', recetaController.crearReceta);

module.exports = router;