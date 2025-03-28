const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { validateUser, registerUser } = require("./CTL/UserCtl");
const { insertSucursal, getSucursales, updateSucursal } = require("./CTL/MapCtl");
const { verifyToken } = require("./Middleware/mid");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Rutas protegidas para sucursales
app.post('/sucursales', verifyToken, insertSucursal);
app.get('/sucursales', verifyToken, getSucursales);
app.post('/sucursales/update', verifyToken, updateSucursal);

// Ruta para validar el token
app.get('/validate-token', verifyToken, (req, res) => {
    res.status(200).json({ valid: true, user: req.username });
});

// Rutas para autenticación de usuarios
app.post('/validate', validateUser);
app.post('/register', registerUser);