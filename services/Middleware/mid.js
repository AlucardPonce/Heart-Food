const jwt = require("jsonwebtoken");
require('dotenv').config();

// Asegúrate que este secret coincida en todos los lugares
const SECRET_KEY = process.env.JWT_SECRET || "tu_super_secreto_complejo_32caracteres";

const generateToken = (userId) => {
    try {
        // Asegúrate que el payload incluya solo la información necesaria
        const payload = { 
            userId: userId,
            iat: Math.floor(Date.now() / 1000) // Fecha de emisión
        };
        
        const token = jwt.sign(payload, SECRET_KEY, { 
            expiresIn: '1h',
            algorithm: 'HS256' // Fuerza el algoritmo
        });
        
        console.log("Token generado:", token); // Debug
        return token;
    } catch (error) {
        console.error("Error al generar token:", error);
        throw error;
    }
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        console.error('No Authorization header found');
        return res.status(403).json({ 
            success: false,
            message: 'Token no proporcionado' 
        });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
        console.error('Malformed Authorization header');
        return res.status(403).json({ 
            success: false,
            message: 'Formato de token inválido' 
        });
    }

    jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', {
                name: err.name,
                message: err.message,
                token: token.substring(0, 20) + '...' // Log parcial
            });
            
            return res.status(401).json({ 
                success: false,
                message: 'Token no válido',
                error: err.message 
            });
        }

        console.log('Token válido para usuario:', decoded.userId);
        req.username = decoded.userId;
        next();
    });
};

module.exports = { generateToken, verifyToken };