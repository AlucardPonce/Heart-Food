const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../DB/DB_connection");

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";

const generateToken = (userId) => {
    return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '10m' });
};

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ statusCode: 403, message: 'Token no proporcionado' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
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

module.exports = { validateUser, registerUser, verifyToken };
