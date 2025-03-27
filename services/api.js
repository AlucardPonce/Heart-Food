require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors");
const bodyParser = require('body-parser');

//const Base_Url = 'https://development-iyl1.onrender.com';
const Base_Url = 'http://localhost:3001';
const app = express();

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en: ${Base_Url}`);
});

if (!process.env.FSA) {
    console.error("❌ ERROR: La variable de entorno FIREBASE_SERVICE_ACCOUNT no está configurada.");
    process.exit(1);
}


const serviceAccount = JSON.parse(process.env.FSA);


try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error("❌ Error al inicializar Firebase:", error);
    process.exit(1);
}

const db = admin.firestore();

db.collection('USERS').limit(1).get()
    .then(() => console.log('✅ Conexión a Firebase establecida correctamente'))
    .catch((err) => console.error('❌ Error al conectar con Firebase:', err));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());




const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
};

const verifyToken = (requiredRoles = []) => {
    return async (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(403).json({ 
                statusCode: 403, 
                intMessage: 'Token no proporcionado' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verificar si el usuario existe en la base de datos
            const userRef = db.collection('USERS').where('username', '==', decoded.userId || decoded.username);
            const userSnapshot = await userRef.get();
            
            if (userSnapshot.empty) {
                return res.status(401).json({ 
                    statusCode: 401, 
                    intMessage: 'Usuario no encontrado' 
                });
            }

            const user = userSnapshot.docs[0].data();
            
            // Verificación de roles (si se especificaron)
            if (requiredRoles.length > 0 && !requiredRoles.includes(user.rol)) {
                return res.status(403).json({ 
                    statusCode: 403, 
                    intMessage: 'No tienes permisos para esta acción' 
                });
            }

            // Adjuntar información del usuario al request
            req.user = {
                id: userSnapshot.docs[0].id,
                username: user.username,
                rol: user.rol,
                gmail: user.gmail
            };

            next();
        } catch (error) {
            console.error('Error al verificar token:', error);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    statusCode: 401, 
                    intMessage: 'Token expirado, inicie sesión nuevamente' 
                });
            }
            
            return res.status(401).json({ 
                statusCode: 401, 
                intMessage: 'Token no válido' 
            });
        }
    };
};

app.post('/validate', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Se requieren username y password' });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            console.log(`❌ Intento de login fallido - Usuario no encontrado: ${username}`);
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const user = querySnapshot.docs[0].data();
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log(`❌ Intento de login fallido - Contraseña incorrecta para usuario: ${username}`);
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const token = generateToken(user.username);
        
        // Logging en consola
        console.log('----------------------------------------');
        console.log('✅ Login exitoso');
        console.log(`📌 Usuario: ${username}`);
        console.log(`🔑 Token generado: ${token}`);
        console.log(`🕒 Hora de login: ${new Date().toISOString()}`);
        console.log('----------------------------------------');

        return res.status(200).json({
            statusCode: 200,
            intMessage: 'Operación exitosa',
            data: {
                message: 'Autenticación exitosa',
                user: { 
                    username: user.username, 
                    gmail: user.gmail,
                    nombre: user.nombre,
                    rol: user.rol 
                },
                token
            }
        });

    } catch (err) {
        console.error('Error al validar usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

// Endpoint para crear/actualizar sucursal (versión mejorada)
app.post('/sucursales', verifyToken, async (req, res) => {
    try {
        console.log('Iniciando inserción de sucursal...');
        console.log('Datos recibidos:', req.body);

        // Validación reforzada
        if (!req.body.nombreSucursal || !req.body.latitud || !req.body.longitud) {
            console.error('Validación fallida:', req.body);
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos',
                requiredFields: ['nombreSucursal', 'latitud', 'longitud']
            });
        }

        // Estructura para Firestore
        const sucursalData = {
            nombreSucursal: req.body.nombreSucursal,
            position: {
                lat: parseFloat(req.body.latitud),
                lng: parseFloat(req.body.longitud)
            },
            direccion: req.body.direccion || '',
            telefono: req.body.telefono || '',
            horario: req.body.horario || '9:00 - 18:00',
            creadoPor: req.user.username,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            status: 'activa'
        };

        console.log('Datos a insertar:', sucursalData);

        // Operación Firestore
        const docRef = await db.collection('sucursales').add(sucursalData);
        console.log('Sucursal creada con ID:', docRef.id);

        return res.status(201).json({
            success: true,
            message: 'Sucursal creada exitosamente',
            data: {
                id: docRef.id,
                ...sucursalData
            }
        });

    } catch (error) {
        console.error('Error crítico:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            errorDetails: {
                code: error.code,
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});
// Endpoint para obtener todas las sucursales
app.get('/sucursales', verifyToken, async (req, res) => {
    console.log('Llegó solicitud a /sucursales'); // Diagnóstico
    console.log('Headers recibidos:', req.headers); // Verifica el header Authorization
    
    try {
        const snapshot = await db.collection('SUCURSALES').get();
        const sucursales = [];
        
        snapshot.forEach(doc => {
            sucursales.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log('Sucursales encontradas:', sucursales.length); // Diagnóstico
        
        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Operación exitosa',
            data: sucursales 
        });
    } catch (error) {
        console.error('Error en /sucursales:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para eliminar sucursal
app.delete('/sucursales/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la sucursal tiene inventario asociado
        const inventarioSnapshot = await db.collection('INVENTARIO')
            .where('sucursalId', '==', id)
            .limit(1)
            .get();

        if (!inventarioSnapshot.empty) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'No se puede eliminar la sucursal porque tiene inventario asociado' 
            });
        }

        await db.collection('SUCURSALES').doc(id).delete();
        
        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Sucursal eliminada correctamente' 
        });
    } catch (error) {
        console.error('Error en endpoint DELETE /sucursales:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para registro de usuarios
app.post('/register', async (req, res) => {
    const { 
        nombre, 
        apellidoPaterno, 
        apellidoMaterno, 
        gmail, 
        username, 
        rol, 
        password 
    } = req.body;

    // Validación de campos requeridos
    if (!nombre || !apellidoPaterno || !gmail || !username || !rol || !password) {
        return res.status(400).json({ 
            statusCode: 400, 
            intMessage: 'Todos los campos son requeridos excepto apellidoMaterno' 
        });
    }

    try {
        // Verificar si el username ya existe
        const usersRef = db.collection('USERS');
        const usernameQuery = await usersRef.where('username', '==', username).get();
        
        if (!usernameQuery.empty) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'El nombre de usuario ya está en uso' 
            });
        }

        // Verificar si el email ya existe
        const emailQuery = await usersRef.where('gmail', '==', gmail).get();
        
        if (!emailQuery.empty) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'El correo electrónico ya está registrado' 
            });
        }

        // Verificar que el rol exista
        const rolRef = db.collection('ROL').doc(rol);
        const rolDoc = await rolRef.get();
        
        if (!rolDoc.exists) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'El rol especificado no existe' 
            });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario
        const userData = {
            nombre,
            apellidoPaterno,
            apellidoMaterno: apellidoMaterno || '', // Opcional
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
            data: { 
                id: newUserRef.id,
                username,
                gmail,
                rol 
            }
        });

    } catch (error) {
        console.error('Error en endpoint /register:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});