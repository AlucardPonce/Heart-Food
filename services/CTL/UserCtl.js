const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../DB/DB_connection");
const { generateToken } = require("../Middleware/mid.js");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes usar cualquier servicio de correo electrónico
    auth: {
        user: 'poncealucard@gmail.com',
        pass: 'vwixjvyzppizaruw'
    }
});

const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8); // Genera una contraseña aleatoria de 8 caracteres
};

const reset = async (req, res) => {
    const { email } = req.body;

    try {
        console.log("Correo recibido:", email); // Log para verificar el correo recibido

        // Cambia "users" por "USERS" para que coincida con tu base de datos
        const userSnapshot = await db.collection("USERS").where("gmail", "==", email).get();

        if (userSnapshot.empty) {
            console.log("Correo no encontrado en la base de datos"); // Log para depuración
            return res.status(404).json({ message: "Correo no registrado" });
        }

        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;

        console.log("Usuario encontrado:", userId); // Log para verificar el usuario encontrado

        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.collection("USERS").doc(userId).update({ password: hashedPassword });

        console.log("Nueva contraseña generada:", newPassword); // Log para verificar la contraseña generada

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Restablecimiento de contraseña",
            text: `Tu nueva contraseña es: ${newPassword}`,
        };

        await transporter.sendMail(mailOptions);

        console.log("Correo enviado a:", email); // Log para verificar el envío del correo

        res.json({ message: "Correo de recuperación enviado" });
    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
        res.status(400).json({ message: "No se pudo enviar el correo", error: error.message });
    }
};

const validateUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Se requieren username y password' });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const user = querySnapshot.docs[0].data();
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const token = generateToken(user.username);

        return res.status(200).json({
            statusCode: 200,
            intMessage: 'Operación exitosa',
            data: {
                message: 'Autenticación exitosa',
                user: { username: user.username, gmail: user.gmail },
                token
            }
        });

    } catch (err) {
        console.error('Error al validar usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
};

const registerUser = async (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, gmail, username, rol, password } = req.body;

    if (!nombre || !apellidoPaterno || !gmail || !username || !rol || !password) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Todos los campos son requeridos excepto apellidoMaterno' });
    }

    try {
        const usersRef = db.collection('USERS');
        const usernameQuery = await usersRef.where('username', '==', username).get();

        if (!usernameQuery.empty) {
            return res.status(400).json({ statusCode: 400, intMessage: 'El nombre de usuario ya está en uso' });
        }

        const emailQuery = await usersRef.where('gmail', '==', gmail).get();

        if (!emailQuery.empty) {
            return res.status(400).json({ statusCode: 400, intMessage: 'El correo electrónico ya está registrado' });
        }

        const rolRef = db.collection('ROL').doc(rol);
        const rolDoc = await rolRef.get();

        if (!rolDoc.exists) {
            return res.status(400).json({ statusCode: 400, intMessage: 'El rol especificado no existe' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            nombre,
            apellidoPaterno,
            apellidoMaterno: apellidoMaterno || '',
            gmail,
            username,
            rol,
            password: hashedPassword,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            activo: true
        };

        const newUserRef = await usersRef.add(userData);

        return res.status(201).json({
            statusCode: 201,
            intMessage: 'Usuario registrado correctamente',
            data: { id: newUserRef.id, username, gmail, rol }
        });

    } catch (error) {
        console.error('Error en endpoint /register:', error);
        return res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: error.message });
    }
};

module.exports = { validateUser, registerUser, reset };
