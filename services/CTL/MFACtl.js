const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../DB/DB_connection');
const bcrypt = require('bcrypt');
const { generateToken } = require('../Middleware/mid');

const validateUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const userDoc = await db.collection("USERS").doc(username).get();
        if (!userDoc.exists) {
            return res.status(401).json({ 
                success: false,
                message: "Credenciales inválidas" 
            });
        }

        const user = userDoc.data();
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                message: "Credenciales inválidas" 
            });
        }

        // Verificar si tiene MFA configurado
        const response = {
            success: true,
            requireMFA: true,
            username: username
        };

        if (!user.mfaSecret) {
            response.mfaSetupRequired = true;
            response.message = "Por favor configura MFA primero";
        } else {
            response.message = "Ingresa tu código MFA";
        }

        return res.json(response);

    } catch (error) {
        console.error("Error en validateUser:", error);
        return res.status(500).json({ 
            success: false,
            message: "Error en el servidor" 
        });
    }
};

const generateMFASecret = async (req, res) => {
    try {
        const { username } = req.body;
        const userDoc = await db.collection("USERS").doc(username).get();

        if (!userDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: "Usuario no encontrado" 
            });
        }

        const secret = speakeasy.generateSecret({
            name: `HeartFood:${username}`,
            issuer: "HeartFood",
            length: 20
        });

        await db.collection("USERS").doc(username).update({
            mfaSecret: secret.base32,
            mfaEnabled: false
        });

        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        return res.json({
            success: true,
            qrCode: qrCode,
            secret: secret.base32,
            message: "Escanea este código con Google Authenticator"
        });

    } catch (error) {
        console.error("Error en generateMFASecret:", error);
        return res.status(500).json({ 
            success: false,
            message: "Error al generar código MFA" 
        });
    }
};

const validateMFA = async (req, res) => {
    try {
        const { username, token } = req.body;

        if (!username || !token) {
            return res.status(400).json({ 
                success: false,
                message: "Datos incompletos" 
            });
        }

        const userDoc = await db.collection("USERS").doc(username).get();
        if (!userDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: "Usuario no encontrado" 
            });
        }

        const user = userDoc.data();
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified) {
            return res.status(401).json({ 
                success: false,
                message: "Código MFA inválido" 
            });
        }

        // Si es primera vez, marcar MFA como habilitado
        if (!user.mfaEnabled) {
            await db.collection("USERS").doc(username).update({ 
                mfaEnabled: true 
            });
        }

        // Generar token JWT
        const jwtToken = generateToken(username);
        console.log("Token generado para", username, ":", jwtToken); // Debug

        if (!jwtToken) {
            throw new Error("Error al generar token JWT");
        }

        return res.json({
            success: true,
            token: jwtToken,
            username: username,
            message: "Autenticación exitosa"
        });

    } catch (error) {
        console.error("Error en validateMFA:", error);
        return res.status(500).json({ 
            success: false,
            message: "Error en el servidor" 
        });
    }
};

module.exports = { 
    validateUser, 
    generateMFASecret, 
    validateMFA 
};