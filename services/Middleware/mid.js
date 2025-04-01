require('dotenv').config(); // Añade esto al inicio

const jwt = require("jsonwebtoken");

// Usa nombres consistentes con el resto de la aplicación
const generateToken = (username) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }
    return jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ statusCode: 403, message: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Error al verificar el token:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(440).json({ statusCode: 440, message: 'Token expirado, inicie sesión nuevamente' });
            }
            return res.status(401).json({ statusCode: 401, message: 'Token no válido' });
        }

        req.username = decoded.username;
        next();
    });
};

module.exports = { generateToken, verifyToken };