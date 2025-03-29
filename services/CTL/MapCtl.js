const admin = require("firebase-admin");
const db = require("../DB/DB_connection");
const { verifyToken } = require("../Middleware/mid");

/**
 * Controlador para insertar una nueva sucursal.
 */
const insertSucursal = async (req, res) => {
    try {
        console.log('Iniciando inserción de sucursal...');
        console.log('Datos recibidos:', req.body);

        // Validar datos requeridos
        if (!req.body.nombreSucursal || !req.body.position ||
            !req.body.position.lat || !req.body.position.lng) {
            console.error('Validación fallida:', req.body);
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos',
                requiredFields: ['nombreSucursal', 'position.lat', 'position.lng']
            });
        }

        // Preparar datos para Firestore
        const sucursalData = {
            nombreSucursal: req.body.nombreSucursal,
            position: {
                lat: parseFloat(req.body.position.lat),
                lng: parseFloat(req.body.position.lng)
            },
            direccion: req.body.direccion || '',
            telefono: req.body.telefono || '',
            horario: req.body.horario || '9:00 - 18:00',
            creadoPor: req.username,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            status: 'activa'
        };

        console.log('Datos a insertar:', sucursalData);

        // Insertar en Firestore
        const docRef = await db.collection('sucursales').add(sucursalData);

        // Actualizar el documento para incluir el ID generado automáticamente
        await docRef.update({ id: docRef.id });

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
};

/**
 * Controlador para actualizar una sucursal existente.
 */
const updateSucursal = async (req, res) => {
    try {
        const { id, ...sucursalData } = req.body; // Obtener el ID y los datos actualizados desde el cuerpo de la solicitud

        console.log(`Actualizando sucursal con ID: ${id}`);
        console.log('Datos recibidos para actualizar:', sucursalData);

        // Validar que el ID exista
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Validar que los datos necesarios estén presentes
        if (!sucursalData.position || !sucursalData.position.lat || !sucursalData.position.lng) {
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos',
                requiredFields: ['position.lat', 'position.lng'],
            });
        }

        // Actualizar el documento en Firestore
        const sucursalRef = db.collection('sucursales').doc(id);
        const sucursalSnapshot = await sucursalRef.get();

        if (!sucursalSnapshot.exists) {
            return res.status(404).json({
                success: false,
                message: 'La sucursal no existe',
            });
        }

        await sucursalRef.update({
            ...sucursalData,
            position: {
                lat: parseFloat(sucursalData.position.lat),
                lng: parseFloat(sucursalData.position.lng),
            },
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Sucursal con ID ${id} actualizada correctamente`);

        return res.status(200).json({
            success: true,
            message: 'Sucursal actualizada correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar la sucursal:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            errorDetails: {
                code: error.code,
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
        });
    }
};

/**
 * Controlador para obtener todas las sucursales.
 */
const getSucursales = async (req, res) => {
    try {
        console.log('Obteniendo todas las sucursales...');

        // Obtener la colección de sucursales
        const snapshot = await db.collection('sucursales').get();

        // Validar si hay datos
        if (snapshot.empty) {
            console.log('No hay sucursales registradas.');
            return res.status(404).json({
                success: false,
                message: 'No hay sucursales registradas'
            });
        }

        // Convertir los documentos a un array
        const sucursales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('Sucursales encontradas:', sucursales.length);

        return res.status(200).json({
            success: true,
            data: sucursales
        });

    } catch (error) {
        console.error('Error al obtener sucursales:', error);
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
};

// Exportar los controladores
module.exports = { insertSucursal, getSucursales, updateSucursal };