require('dotenv').config();
const express = require('express');
const cors = require('cors');
const recetaController = require('./App/Http/Controllers/recetaController');
const database = require('./config/database');

const app = express();
conectarDB();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});