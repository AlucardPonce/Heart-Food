const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require('fs');
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.FSA);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

db.collection('users').limit(1).get()
    .then(() => console.log('✅ Conexión a Firebase establecida correctamente'))
    .catch((err) => console.error('❌ Error al conectar con Firebase:', err));

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";


const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
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

        req.username = decoded.userId || decoded.username;
        next();
    });
};


app.post('/register', async (req, res) => {
    const { username, password, gmail } = req.body; 
    const last_login = new Date().toISOString(); 

    if (!username || !password || !gmail) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Todos los campos son obligatorios' });
    }

    try {
        const usersRef = db.collection('USERS');
        const existingUser = await usersRef.where('username', '==', username).get();
        const existingGmail = await usersRef.where('gmail', '==', gmail).get();

        if (!existingUser.empty || !existingGmail.empty) {
            return res.status(409).json({ statusCode: 409, intMessage: 'El username o gmail ya están en uso' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = usersRef.doc(); // Crear un nuevo documento con un ID único

        await userRef.set({
            username,
            password: hashedPassword,
            gmail,
            last_login,
            rol: 'worker', // Asignamos el rol 'worker' por defecto
            id: userRef.id 
        });

        return res.status(201).json({ statusCode: 201, intMessage: 'Usuario registrado con éxito', data: { username, gmail, id: userRef.id } });

    } catch (err) {
        console.error('Error registrando usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Internal Server Error' });
    }
});


app.post('/validate', async (req, res) => {
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
});