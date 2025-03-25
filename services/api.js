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

db.collection('users').limit(1).get()
    .then(() => console.log('✅ Conexión a Firebase establecida correctamente'))
    .catch((err) => console.error('❌ Error al conectar con Firebase:', err));


app.use(cors());
app.use(express.json());
app.use(bodyParser.json());




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

// Endpoint para crear o actualizar sucursal
app.post('/sucursales', verifyToken, async (req, res) => {
    try {
        const { id, ...sucursalData } = req.body;

        // Validación básica
        if (!sucursalData.nombreSucursal || !sucursalData.position) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'Nombre y posición son requeridos' 
            });
        }

        if (id) {
            // Actualizar sucursal existente
            await db.collection('SUCURSALES').doc(id).update(sucursalData);
            return res.status(200).json({ 
                statusCode: 200, 
                intMessage: 'Sucursal actualizada correctamente',
                data: { id }
            });
        } else {
            // Crear nueva sucursal
            const docRef = await db.collection('SUCURSALES').add(sucursalData);
            return res.status(201).json({ 
                statusCode: 201, 
                intMessage: 'Sucursal creada correctamente',
                data: { id: docRef.id }
            });
        }
    } catch (error) {
        console.error('Error en endpoint /sucursales:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener todas las sucursales
app.get('/sucursales', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('SUCURSALES').get();
        const sucursales = [];
        
        snapshot.forEach(doc => {
            sucursales.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Operación exitosa',
            data: sucursales 
        });
    } catch (error) {
        console.error('Error en endpoint /sucursales:', error);
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

// Endpoint para crear o actualizar producto en inventario
app.post('/inventario', verifyToken, async (req, res) => {
    try {
        const { id, ...productoData } = req.body;

        // Validación básica
        if (!productoData.sucursalId || !productoData.nombre || !productoData.categoriaId) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'Datos incompletos para el producto' 
            });
        }

        if (id) {
            // Actualizar producto existente
            await db.collection('INVENTARIO').doc(id).update(productoData);
            return res.status(200).json({ 
                statusCode: 200, 
                intMessage: 'Producto actualizado correctamente',
                data: { id }
            });
        } else {
            // Crear nuevo producto
            const docRef = await db.collection('INVENTARIO').add(productoData);
            return res.status(201).json({ 
                statusCode: 201, 
                intMessage: 'Producto creado correctamente',
                data: { id: docRef.id }
            });
        }
    } catch (error) {
        console.error('Error en endpoint /inventario:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener inventario por sucursal
app.get('/inventario/sucursal/:sucursalId', verifyToken, async (req, res) => {
    try {
        const { sucursalId } = req.params;
        
        const snapshot = await db.collection('INVENTARIO')
            .where('sucursalId', '==', sucursalId)
            .get();
            
        const inventario = [];
        snapshot.forEach(doc => {
            inventario.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Operación exitosa',
            data: inventario 
        });
    } catch (error) {
        console.error('Error en endpoint /inventario/sucursal:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para eliminar producto
app.delete('/inventario/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('INVENTARIO').doc(id).delete();
        
        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Producto eliminado correctamente' 
        });
    } catch (error) {
        console.error('Error en endpoint DELETE /inventario:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener todas las categorías
app.get('/categorias', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('CATEGORIAS').get();
        const categorias = [];
        
        snapshot.forEach(doc => {
            categorias.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json({ 
            statusCode: 200, 
            intMessage: 'Operación exitosa',
            data: categorias 
        });
    } catch (error) {
        console.error('Error en endpoint /categorias:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para crear categoría
app.post('/categorias', verifyToken, async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({ 
                statusCode: 400, 
                intMessage: 'El nombre de la categoría es requerido' 
            });
        }

        const docRef = await db.collection('CATEGORIAS').add({ nombre });
        
        return res.status(201).json({ 
            statusCode: 201, 
            intMessage: 'Categoría creada correctamente',
            data: { id: docRef.id }
        });
    } catch (error) {
        console.error('Error en endpoint /categorias:', error);
        return res.status(500).json({ 
            statusCode: 500, 
            intMessage: 'Error interno del servidor',
            error: error.message 
        });
    }
});