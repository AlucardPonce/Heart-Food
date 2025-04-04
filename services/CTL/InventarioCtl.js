const admin = require("firebase-admin");
const db = require("../DB/DB_connection");
const { verifyToken } = require("../Middleware/mid");
const multer = require('multer');
const path = require('path'); // Importa el módulo path
const fs = require('fs'); // Importa el módulo fs si no está ya importado

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../Frontend/public/uploads/productos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo imágenes (JPEG, JPG, PNG, GIF) son permitidas'));
        }
    }
}).single('imagen');

const insertProducto = async (req, res) => {
    upload(req, res, async (err) => {
        try {
            console.log('Iniciando inserción de producto...');

            if (err) {
                console.error('Error al subir imagen:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            // Validar datos requeridos
            if (!req.body.nombre || !req.body.precioPublico ||
                !req.body.precioCompra || !req.body.categoria ||
                !req.body.cantidad) {
                console.error('Validación fallida:', req.body);

                // Eliminar imagen si se subió pero hay error de validación
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos',
                    requiredFields: ['nombre', 'precioPublico', 'precioCompra', 'categoria', 'cantidad']
                });
            }

            // Preparar datos para Firestore
            const productoData = {
                nombre: req.body.nombre,
                precioPublico: parseFloat(req.body.precioPublico),
                precioCompra: parseFloat(req.body.precioCompra),
                categoria: req.body.categoria,
                cantidad: parseInt(req.body.cantidad),
                codigoBarras: req.body.codigoBarras || '',
                descripcion: req.body.descripcion || '',
                proveedor: req.body.proveedor || '',
                minimoStock: parseInt(req.body.minimoStock) || 5,
                creadoPor: req.username,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
                fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
                status: 'activo'
            };

            // Agregar la URL de la imagen si se subió
            if (req.file) {
                productoData.imagenUrl = '/uploads/productos/' + req.file.filename;
            }

            console.log('Datos a insertar:', productoData);

            // Insertar en Firestore
            const docRef = await db.collection('inventario').add(productoData);

            // Actualizar el documento para incluir el ID generado automáticamente
            await docRef.update({ id: docRef.id });

            console.log('Producto creado con ID:', docRef.id);

            return res.status(201).json({
                success: true,
                message: 'Producto creado exitosamente',
                data: {
                    id: docRef.id,
                    ...productoData
                }
            });

        } catch (error) {
            console.error('Error crítico:', error);

            // Eliminar imagen si hubo error después de subirla
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

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
};

/**
 * Controlador para actualizar un producto existente.
 */
const updateProducto = async (req, res) => {
    // Manejar la subida de archivos primero
    upload(req, res, async (err) => {
        try {
            console.log(`Actualizando producto...`);

            if (err) {
                console.error('Error al subir imagen:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            const { id, imagenUrlAnterior, ...productoData } = req.body;

            // Validar que el ID exista
            if (!id) {
                // Eliminar imagen si se subió pero no hay ID
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'El ID del producto es requerido'
                });
            }

            // Si se actualiza la categoría, verificar que exista
            if (productoData.categoria) {
                const categoriaRef = db.collection('categorias').doc(productoData.categoria);
                const categoriaDoc = await categoriaRef.get();

                if (!categoriaDoc.exists) {
                    // Eliminar imagen si se subió pero la categoría no existe
                    if (req.file) {
                        fs.unlinkSync(req.file.path);
                    }
                    return res.status(400).json({
                        success: false,
                        message: 'La categoría especificada no existe'
                    });
                }
            }

            // Preparar datos para actualización
            const updateData = {
                ...productoData,
                fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
            };

            // Si hay nueva imagen, actualizar la URL y eliminar la anterior
            if (req.file) {
                updateData.imagenUrl = '/uploads/productos/' + req.file.filename;

                // Eliminar imagen anterior si existe
                if (imagenUrlAnterior) {
                    const oldImagePath = path.join(__dirname, '../../public', imagenUrlAnterior);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
            }

            // Convertir tipos de datos numéricos
            if (productoData.precioPublico) updateData.precioPublico = parseFloat(productoData.precioPublico);
            if (productoData.precioCompra) updateData.precioCompra = parseFloat(productoData.precioCompra);
            if (productoData.cantidad) updateData.cantidad = parseInt(productoData.cantidad);
            if (productoData.minimoStock) updateData.minimoStock = parseInt(productoData.minimoStock);

            console.log('Datos a actualizar:', updateData);

            // Actualizar el documento en Firestore
            const productoRef = db.collection('inventario').doc(id);
            const productoSapshot = await productoRef.get();

            if (!productoSapshot.exists) {
                // Eliminar imagen si se subió pero el producto no existe
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'El producto no existe'
                });
            }

            await productoRef.update(updateData);

            console.log(`Producto con ID ${id} actualizado correctamente`);

            return res.status(200).json({
                success: true,
                message: 'Producto actualizado correctamente',
                data: {
                    id,
                    ...updateData
                }
            });

        } catch (error) {
            console.error('Error al actualizar el producto:', error);

            // Eliminar imagen si hubo error después de subirla
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

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
};

/**
 * Controlador para obtener todos los productos del inventario.
 */
const getProductos = async (req, res) => {
    try {
        console.log('Obteniendo todos los productos...');

        // Obtener la colección de inventario
        const snapshot = await db.collection('inventario').get();

        // Validar si hay datos
        if (snapshot.empty) {
            console.log('No hay productos registrados.');
            return res.status(404).json({
                success: false,
                message: 'No hay productos registrados'
            });
        }

        // Convertir los documentos a un array
        const productos = await Promise.all(snapshot.docs.map(async doc => {
            const productoData = doc.data();

            // Obtener datos de la categoría
            if (productoData.categoria) {
                const categoriaRef = db.collection('categorias').doc(productoData.categoria);
                const categoriaDoc = await categoriaRef.get();
                productoData.categoriaData = categoriaDoc.exists ? categoriaDoc.data() : null;
            }

            return {
                id: doc.id,
                ...productoData
            };
        }));

        console.log('Productos encontrados:', productos.length);

        return res.status(200).json({
            success: true,
            data: productos
        });

    } catch (error) {
        console.error('Error al obtener productos:', error);
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
 * Controlador para obtener un producto específico por ID (recibido en el body)
 */
const getProductoById = async (req, res) => {
    try {
        const { id } = req.body;

        console.log(`Obteniendo producto con ID: ${id}`);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto es requerido en el cuerpo de la solicitud'
            });
        }

        const productoRef = db.collection('inventario').doc(id);
        const productoDoc = await productoRef.get();

        if (!productoDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const productoData = productoDoc.data();

        // Obtener datos de la categoría
        if (productoData.categoria) {
            const categoriaRef = db.collection('categorias').doc(productoData.categoria);
            const categoriaDoc = await categoriaRef.get();
            productoData.categoriaData = categoriaDoc.exists ? categoriaDoc.data() : null;
        }

        console.log('Producto encontrado:', productoData.nombre);

        return res.status(200).json({
            success: true,
            data: {
                id: productoDoc.id,
                ...productoData
            }
        });

    } catch (error) {
        console.error('Error al obtener el producto:', error);
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

const deleteProducto = async (req, res) => {
    const startTime = Date.now();
    const log = (message) => console.log(`[${Date.now() - startTime}ms] ${message}`);

    try {
        log("Iniciando desactivación de producto");
        const { id } = req.body;

        if (!id || typeof id !== 'string') {
            log("ID inválido recibido");
            return res.status(400).json({
                success: false,
                message: 'ID de producto no válido',
                receivedId: id,
                type: typeof id
            });
        }

        log(`Buscando producto con ID: ${id}`);
        const productoRef = db.collection('inventario').doc(id);
        const productoDoc = await productoRef.get();

        if (!productoDoc.exists) {
            log("Producto no encontrado");
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado',
                productId: id
            });
        }

        log("Producto encontrado, actualizando estado...");
        const updateData = {
            status: 'inactivo',
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };

        await productoRef.update(updateData);
        log("Producto desactivado exitosamente");

        return res.status(200).json({
            success: true,
            message: 'Producto desactivado correctamente',
            productId: id,
            newStatus: 'inactivo'
        });

    } catch (error) {
        log(`Error: ${error.message}`);
        console.error("Detalles técnicos:", {
            errorCode: error.code,
            errorMessage: error.message,
            firebaseError: error.details || 'No disponible'
        });

        return res.status(500).json({
            success: false,
            message: 'Error al desactivar el producto',
            ...(process.env.NODE_ENV === 'development' && {
                technicalDetails: {
                    code: error.code,
                    message: error.message
                }
            })
        });
    }
};

const insertCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la categoría es requerido'
            });
        }

        const categoriaData = {
            nombre,
            descripcion: descripcion || '',
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
            status: 'activo'
        };

        const docRef = await db.collection('categorias').add(categoriaData);
        await docRef.update({ id: docRef.id });

        return res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: {
                id: docRef.id,
                ...categoriaData
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

const getCategorias = async (req, res) => {
    try {
        const snapshot = await db.collection('categorias')
            .where('status', '==', 'activo')
            .get();

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No hay categorías registradas'
            });
        }

        const categorias = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.status(200).json({
            success: true,
            data: categorias
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

/**
 * Eliminar producto permanentemente
 */
const deleteProductoPermanente = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del producto'
            });
        }

        const productoRef = db.collection('inventario').doc(id);
        await productoRef.delete();

        return res.status(200).json({
            success: true,
            message: 'Producto eliminado permanentemente'
        });

    } catch (error) {
        console.error('Error al eliminar:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

/**
 * Cambiar estado (activar/desactivar)
 */
const toggleStatusProducto = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el ID del producto'
            });
        }

        const productoRef = db.collection('inventario').doc(id);
        const productoDoc = await productoRef.get();

        if (!productoDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        const currentStatus = productoDoc.data().status;
        const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';

        await productoRef.update({
            status: newStatus,
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: `Producto ${newStatus === 'activo' ? 'activado' : 'desactivado'}`,
            newStatus
        });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Exportar los controladores
module.exports = {
    insertProducto,
    getProductos,
    updateProducto,
    getProductoById,
    deleteProducto,
    insertCategoria,
    getCategorias,
    deleteProductoPermanente,
    toggleStatusProducto
};