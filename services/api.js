const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { validateUser, registerUser } = require("./CTL/UserCtl");
const { insertSucursal, getSucursales, updateSucursal } = require("./CTL/MapCtl");
const { verifyToken } = require("./Middleware/mid");
const { insertProducto, getProductos, updateProducto, getProductoById, deleteProducto, insertCategoria, getCategorias } = require("./CTL/InventarioCtl");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

// Rutas protegidas para sucursales
app.post('/sucursales', verifyToken, insertSucursal);
app.get('/sucursales', verifyToken, getSucursales);
app.post('/sucursales/update', verifyToken, updateSucursal);

// Rutas protegidas para productos (todas reciben ID por body)
app.post('/productos', verifyToken, insertProducto);
app.get('/productos', verifyToken, getProductos);
app.post('/productos/update', verifyToken, updateProducto);
app.post('/productos/get', verifyToken, getProductoById);
app.post('/productos/delete', verifyToken, deleteProducto);
app.post('/productos/insert-categoria', verifyToken, insertCategoria);
app.get('/productos/get-categorias', verifyToken, getCategorias);

// Ruta para validar el token
app.get('/validate-token', verifyToken, (req, res) => {
    res.status(200).json({ valid: true, user: req.username });
});

// Rutas para autenticación de usuarios
app.post('/validate', validateUser);
app.post('/register', registerUser);