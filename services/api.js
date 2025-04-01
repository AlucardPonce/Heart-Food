const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { validateUser, 
    registerUser, 
    reset, 
    verifyOTP,
    toggleTwoFactorAuth,
    verifyResetOTP } = require("./CTL/UserCtl");
const { insertSucursal, getSucursales, updateSucursal, deleteSucursal } = require("./CTL/MapCtl");
const { verifyToken } = require("./Middleware/mid");
const { insertProducto, getProductos, updateProducto, getProductoById, insertCategoria, getCategorias, deleteProductoPermanente, toggleStatusProducto } = require("./CTL/InventarioCtl");
const { registrarVenta, getHistorialVentas, getProductosActivos, getVentaById } = require("./CTL/VentasCtl");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

app.post('/sucursales', verifyToken, insertSucursal);
app.get('/sucursales', verifyToken, getSucursales);
app.post('/sucursales/update', verifyToken, updateSucursal);
app.delete('/sucursales/:id', verifyToken, deleteSucursal);

app.post('/productos', verifyToken, (req, res) => {
    insertProducto(req, res);
});
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.get('/productos', verifyToken, getProductos);
app.post('/productos/update', verifyToken, updateProducto);
app.post('/productos/get', verifyToken, getProductoById);
app.post('/productos/insert-categoria', verifyToken, insertCategoria);
app.get('/productos/get-categorias', verifyToken, getCategorias);
app.post('/productos/delete-permanent', verifyToken, deleteProductoPermanente);
app.post('/productos/toggle-status', verifyToken, toggleStatusProducto);

app.post('/ventas', verifyToken, registrarVenta);
app.get('/ventas', verifyToken, getHistorialVentas);
app.get('/productos-activos', verifyToken, getProductosActivos);
app.get('/ventas/:id', verifyToken, getVentaById);

app.get('/validate-token', verifyToken, (req, res) => {
    res.status(200).json({ valid: true, user: req.username });
});

app.post('/validate', validateUser);
app.post('/register', registerUser);
app.post('/reset-password', reset);
app.post('/verify-otp', verifyOTP);
app.post('/verify-reset-otp', verifyResetOTP);
app.post('/toggle-2fa', toggleTwoFactorAuth);
app.post('/toggle-2fa/verify', verifyToken, toggleTwoFactorAuth);

// ==================== 🔴 IMPLEMENTACIÓN DE SSE 🔴 ====================

let clients = []; 

app.get('/events', (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(client => client !== res);
    });
});

function sendUpdate(data) {
    clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}

setInterval(() => {
    sendUpdate({ message: "Nueva venta realizada", timestamp: Date.now() });
}, 10000);


