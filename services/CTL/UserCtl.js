const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
require("dotenv").config();
const db = require("../DB/DB_connection");
const { generateToken } = require("../Middleware/mid.js");
const nodemailer = require("nodemailer");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'poncealucard@gmail.com',
        pass: process.env.EMAIL_PASS || 'vwixjvyzppizaruw'
    }
});

// Función para generar contraseña aleatoria
const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8);
};

// Función para enviar correo con QR de 2FA
const sendOTPEmail = async (email, secret) => {
    try {
        const otpauthUrl = speakeasy.otpauthURL({
            secret: secret.ascii,
            label: `AuthApp:${email}`,
            issuer: 'AuthApp'
        });

        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Configuración de Autenticación de Dos Factores",
            html: `
                <h2>Configura tu Autenticación de Dos Factores</h2>
                <p>Escanea este código QR con Google Authenticator:</p>
                <img src="${qrCodeUrl}" alt="QR Code" style="display:block; margin:20px auto;"/>
                <p>O ingresa manualmente este código secreto: <strong>${secret.base32}</strong></p>
                <p>Necesitarás este código para iniciar sesión en el futuro.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true, secret: secret.base32 };
    } catch (error) {
        console.error("Error sending OTP email:", error);
        return { success: false, error: error.message };
    }
};

// Función para enviar OTP temporal
const sendTemporaryOTP = async (email, token) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Tu Código de Verificación",
            text: `Tu código de verificación es: ${token}\nExpira en 5 minutos.`
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error sending temporary OTP:", error);
        return false;
    }
};

// Controlador para restablecer contraseña
const reset = async (req, res) => {
    const { email } = req.body;

    try {
        const userSnapshot = await db.collection("USERS").where("gmail", "==", email).get();

        if (userSnapshot.empty) {
            return res.status(404).json({
                statusCode: 404,
                intMessage: 'Correo no registrado'
            });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        // Si tiene 2FA habilitado, enviar OTP
        if (userData.twoFactorEnabled && userData.twoFactorSecret) {
            const tempToken = speakeasy.totp({
                secret: userData.twoFactorSecret,
                encoding: 'base32',
                step: 300, // 5 minutos
                digits: 6
            });
            console.log("OTP generado:", tempToken);

            await sendTemporaryOTP(email, tempToken);

            return res.json({
                statusCode: 200,
                intMessage: 'Se ha enviado un OTP a tu correo',
                requiresOTP: true,
                email
            });
        }

        // Restablecimiento normal
        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await userDoc.ref.update({ password: hashedPassword });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Nueva Contraseña",
            text: `Tu nueva contraseña es: ${newPassword}`
        };

        await transporter.sendMail(mailOptions);

        res.json({
            statusCode: 200,
            intMessage: 'Correo de recuperación enviado'
        });

    } catch (error) {
        console.error("Error en reset:", error);
        res.status(500).json({
            statusCode: 500,
            intMessage: 'Error al procesar la solicitud',
            error: error.message
        });
    }
};

// Controlador para verificar OTP de restablecimiento
const verifyResetOTP = async (req, res) => {
    const { email, otpToken, newPassword } = req.body;

    if (!/^\d{6}$/.test(otpToken)) {
        return res.status(400).json({ intMessage: "Formato de OTP inválido" });
    }

    try {
        const userSnapshot = await db.collection("USERS").where("gmail", "==", email).get();

        if (userSnapshot.empty) {
            return res.status(404).json({
                statusCode: 404,
                intMessage: 'Usuario no encontrado'
            });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        const verified = speakeasy.totp.verify({
            secret: userData.twoFactorSecret,
            encoding: 'base32',
            token: otpToken,
            step: 300, // 5 minutos
            window: 2 // Permite un margen de 2 intervalos de tiempo
        });

        console.log({
            otpToken,
            secret: userData.twoFactorSecret,
            verified
        });

        if (!verified) {
            return res.status(401).json({
                statusCode: 401,
                intMessage: 'OTP inválido o expirado'
            });
        }

        // Si se proporcionó nueva contraseña, actualizar
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await userDoc.ref.update({ password: hashedPassword });

            return res.json({
                statusCode: 200,
                intMessage: 'Contraseña actualizada correctamente'
            });
        }

        res.json({
            statusCode: 200,
            intMessage: 'OTP verificado correctamente',
            verified: true
        });

    } catch (error) {
        console.error("Error en verifyResetOTP:", error);
        res.status(500).json({
            statusCode: 500,
            intMessage: 'Error al verificar OTP',
            error: error.message
        });
    }
};

// Controlador para login con OTP
const validateUser = async (req, res) => {
    const { username, password, otpToken } = req.body;

    console.log("Datos recibidos:", { username, password, otpToken });

    // Validación básica de los parámetros de entrada
    if (!username || !password) {
        return res.status(400).json({
            statusCode: 400,
            intMessage: 'Usuario y contraseña son requeridos'
        });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            return res.status(401).json({
                statusCode: 401,
                intMessage: 'Credenciales incorrectas'
            });
        }

        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data();

        // Verificación adicional del hash almacenado
        if (!user.password || typeof user.password !== 'string') {
            console.error('Hash de contraseña inválido para el usuario:', username);
            return res.status(500).json({
                statusCode: 500,
                intMessage: 'Error en la configuración del usuario'
            });
        }

        // Comparación segura de contraseñas
        const isPasswordValid = await bcrypt.compare(password.toString(), user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                statusCode: 401,
                intMessage: 'Credenciales incorrectas'
            });
        }

        // Verificación de 2FA si está activado
        if (user.twoFactorEnabled) {
            if (!otpToken) {
                return res.status(200).json({
                    statusCode: 200,
                    intMessage: 'Se requiere autenticación de dos factores',
                    requiresMFA: true,
                    username
                });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: otpToken,
                window: 1
            });

            console.log({
                otpToken,
                secret: user.twoFactorSecret,
                verified
            });

            if (!verified) {
                return res.status(401).json({
                    statusCode: 401,
                    intMessage: 'Código OTP inválido'
                });
            }
        }

        // Generación del token JWT
        const token = generateToken(user.username);

        return res.status(200).json({
            statusCode: 200,
            intMessage: 'Autenticación exitosa',
            data: {
                user: {
                    username: user.username,
                    gmail: user.gmail,
                    twoFactorEnabled: user.twoFactorEnabled || false
                },
                token
            }
        });

    } catch (err) {
        console.error('Error detallado en validateUser:', {
            error: err.message,
            stack: err.stack,
            inputParams: { username, password: password ? 'provided' : 'missing' }
        });

        return res.status(500).json({
            statusCode: 500,
            intMessage: 'Error interno del servidor',
            error: err.message
        });
    }
};

// Controlador para verificar OTP
const verifyOTP = async (req, res) => {
    const { username, token } = req.body;

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            return res.status(404).json({
                statusCode: 404,
                intMessage: 'Usuario no encontrado'
            });
        }

        const user = querySnapshot.docs[0].data();

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        console.log({
            token,
            secret: user.twoFactorSecret,
            verified
        });

        if (verified) {
            // Generar token JWT después de verificar OTP
            const authToken = generateToken(user.username);

            return res.json({
                statusCode: 200,
                intMessage: 'OTP verificado correctamente',
                data: {
                    user: {
                        username: user.username,
                        gmail: user.gmail,
                        twoFactorEnabled: true
                    },
                    token: authToken
                }
            });
        } else {
            return res.status(401).json({
                statusCode: 401,
                intMessage: 'OTP inválido'
            });
        }
    } catch (error) {
        console.error('Error en verifyOTP:', error);
        return res.status(500).json({
            statusCode: 500,
            intMessage: 'Error al verificar OTP',
            error: error.message
        });
    }
};

// Controlador para registro con generación de secreto 2FA
const registerUser = async (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, gmail, username, rol, password, sucursalId } = req.body;

    // Validar campos requeridos
    if (!nombre || !apellidoPaterno || !gmail || !username || !rol || !password || !sucursalId) {
        return res.status(400).json({
            statusCode: 400,
            intMessage: 'Todos los campos son requeridos excepto apellidoMaterno'
        });
    }

    try {
        const usersRef = db.collection('USERS');
        const sucursalesRef = db.collection('SUCURSALES');

        // Verificar si el usuario ya existe
        const usernameQuery = await usersRef.where('username', '==', username).get();
        if (!usernameQuery.empty) {
            return res.status(400).json({
                statusCode: 400,
                intMessage: 'El nombre de usuario ya está en uso'
            });
        }

        // Verificar si el correo ya existe
        const emailQuery = await usersRef.where('gmail', '==', gmail).get();
        if (!emailQuery.empty) {
            return res.status(400).json({
                statusCode: 400,
                intMessage: 'El correo electrónico ya está registrado'
            });
        }

        // Verificar si el rol existe
        const rolRef = db.collection('ROL').doc(rol);
        const rolDoc = await rolRef.get();
        if (!rolDoc.exists) {
            return res.status(400).json({
                statusCode: 400,
                intMessage: 'El rol especificado no existe'
            });
        }

        // Verificar si la sucursal existe
        const sucursalDoc = await sucursalesRef.doc(sucursalId).get();
        if (!sucursalDoc.exists) {
            return res.status(400).json({
                statusCode: 400,
                intMessage: 'La sucursal especificada no existe'
            });
        }

        // Generar hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generar secreto para 2FA
        const secret = speakeasy.generateSecret({
            length: 20,
            name: `AuthApp:${gmail}`
        });

        // Crear objeto de usuario
        const userData = {
            nombre,
            apellidoPaterno,
            apellidoMaterno: apellidoMaterno || '',
            gmail,
            username,
            rol,
            password: hashedPassword,
            sucursalId, // Relación con la sucursal
            twoFactorSecret: secret.base32,
            twoFactorEnabled: true, // Por defecto activado
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            activo: true
        };

        // Guardar usuario en Firestore
        const newUserRef = await usersRef.add(userData);

        // Enviar correo con QR para 2FA
        const emailResult = await sendOTPEmail(gmail, secret);

        if (!emailResult.success) {
            console.warn("Usuario registrado pero no se pudo enviar el correo de 2FA");
        }

        return res.status(201).json({
            statusCode: 201,
            intMessage: 'Usuario registrado correctamente',
            data: {
                id: newUserRef.id,
                username,
                gmail,
                rol,
                sucursalId,
                twoFactorSetup: true,
                secretUrl: speakeasy.otpauthURL({
                    secret: secret.ascii,
                    label: `AuthApp:${gmail}`,
                    issuer: 'AuthApp'
                })
            }
        });

    } catch (error) {
        console.error('Error en registerUser:', error);
        return res.status(500).json({
            statusCode: 500,
            intMessage: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Controlador para activar/desactivar 2FA
const toggleTwoFactorAuth = async (req, res) => {
    const { username, enable, otpToken } = req.body;

    if (typeof enable !== 'boolean') {
        return res.status(400).json({
            statusCode: 400,
            intMessage: 'El parámetro "enable" es requerido y debe ser booleano'
        });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            return res.status(404).json({
                statusCode: 404,
                intMessage: 'Usuario no encontrado'
            });
        }

        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data();

        // Si se está activando, verificar OTP
        if (enable) {
            if (!otpToken) {
                return res.status(400).json({
                    statusCode: 400,
                    intMessage: 'Se requiere un OTP para activar 2FA'
                });
            }

            if (!/^\d{6}$/.test(otpToken)) {
                return res.status(400).json({ intMessage: "Formato de OTP inválido" });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: otpToken,
                window: 1
            });

            console.log({
                otpToken,
                secret: user.twoFactorSecret,
                verified
            });

            if (!verified) {
                return res.status(401).json({
                    statusCode: 401,
                    intMessage: 'OTP inválido'
                });
            }
        }

        // Actualizar estado de 2FA
        await userDoc.ref.update({ twoFactorEnabled: enable });

        return res.json({
            statusCode: 200,
            intMessage: `Autenticación de dos factores ${enable ? 'activada' : 'desactivada'} correctamente`,
            data: {
                twoFactorEnabled: enable
            }
        });

    } catch (error) {
        console.error('Error en toggleTwoFactorAuth:', error);
        return res.status(500).json({
            statusCode: 500,
            intMessage: 'Error al cambiar estado de 2FA',
            error: error.message
        });
    }
};

module.exports = {
    validateUser,
    registerUser,
    reset,
    verifyOTP,
    toggleTwoFactorAuth,
    verifyResetOTP
};