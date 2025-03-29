const admin = require("firebase-admin");
const db = require("../DB/DB_connection");
const { verifyToken } = require("../Middleware/mid");

/**
 * Controlador para insertar un nuevo producto en el inventario.
 */
const insertProducto = async (req, res) => {
    try {
        console.log('Iniciando inserción de producto...');
        console.log('Datos recibidos:', req.body);

        // Validar datos requeridos
        if (!req.body.nombre || !req.body.precioPublico ||
            !req.body.precioCompra || !req.body.categoria ||
            !req.body.cantidad) {
            console.error('Validación fallida:', req.body);
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos',
                requiredFields: ['nombre', 'precioPublico', 'precioCompra', 'categoria', 'cantidad']
            });
        }

        // Verificar que la categoría exista
        const categoriaRef = db.collection('categorias').doc(req.body.categoria);
        const categoriaDoc = await categoriaRef.get();

        if (!categoriaDoc.exists) {
            return res.status(400).json({
                success: false,
                message: 'La categoría especificada no existe'
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
 * Controlador para actualizar un producto existente.
 */
const updateProducto = async (req, res) => {
    try {
        const { id, ...productoData } = req.body;

        console.log(`Actualizando producto con ID: ${id}`);
        console.log('Datos recibidos para actualizar:', productoData);

        // Validar que el ID exista
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto es requerido en el cuerpo de la solicitud',
            });
        }

        // Si se actualiza la categoría, verificar que exista
        if (productoData.categoria) {
            const categoriaRef = db.collection('categorias').doc(productoData.categoria);
            const categoriaDoc = await categoriaRef.get();

            if (!categoriaDoc.exists) {
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

        // Convertir tipos de datos si es necesario
        if (productoData.precioPublico) updateData.precioPublico = parseFloat(productoData.precioPublico);
        if (productoData.precioCompra) updateData.precioCompra = parseFloat(productoData.precioCompra);
        if (productoData.cantidad) updateData.cantidad = parseInt(productoData.cantidad);
        if (productoData.minimoStock) updateData.minimoStock = parseInt(productoData.minimoStock);

        // Actualizar el documento en Firestore
        const productoRef = db.collection('inventario').doc(id);
        const productoSapshot = await productoRef.get();

        if (!productoSapshot.exists) {
            return res.status(404).json({
                success: false,
                message: 'El producto no existe',
            });
        }

        await productoRef.update(updateData);

        console.log(`Producto con ID ${id} actualizado correctamente`);

        return res.status(200).json({
            success: true,
            message: 'Producto actualizado correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
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

/**
 * Controlador para eliminar un producto (cambiar status a inactivo)
 */
const deleteProducto = async (req, res) => {
    try {
        const { id } = req.body;

        console.log(`Eliminando (desactivando) producto con ID: ${id}`);

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

        // Actualizar el status a inactivo en lugar de borrar
        await productoRef.update({
            status: 'inactivo',
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Producto con ID ${id} marcado como inactivo`);

        return res.status(200).json({
            success: true,
            message: 'Producto desactivado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar el producto:', error);
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

// Exportar los controladores
module.exports = {
    insertProducto,
    getProductos,
    updateProducto,
    getProductoById,
    deleteProducto,
    insertCategoria,
    getCategorias
};