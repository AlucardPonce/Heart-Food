const admin = require("firebase-admin");
const db = require("../DB/DB_connection");
const { verifyToken } = require("../Middleware/mid");
const multer = require('multer');
const path = require('path'); // Importa el módulo path
const fs = require('fs'); // Importa el módulo fs si no está ya importado

// Agrega esto al final de tu archivo, antes del module.exports

/**
 * Obtener productos activos con stock
 */
const getProductosActivos = async (req, res) => {
    try {
        console.log('Obteniendo productos activos con stock...');

        // Obtener todos los productos activos primero
        const snapshot = await db.collection('inventario')
            .where('status', '==', 'activo')
            .get();

        if (snapshot.empty) {
            console.log('No hay productos activos con stock.');
            return res.status(404).json({
                success: false,
                message: 'No hay productos disponibles'
            });
        }

        // Filtrar por cantidad en memoria
        const productos = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(producto => producto.cantidad > 0);

        console.log('Productos activos encontrados:', productos.length);

        return res.status(200).json({
            success: true,
            data: productos
        });

    } catch (error) {
        console.error('Error al obtener productos activos:', error);
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
 * Registrar una nueva venta
 */
const registrarVenta = async (req, res) => {
    const startTime = Date.now();
    const log = (message) => console.log(`[${Date.now() - startTime}ms] ${message}`);

    try {
        log("Iniciando registro de venta...");
        const { productos, metodoPago, cliente } = req.body;

        // Validaciones básicas
        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            log("Validación fallida: productos no válidos");
            return res.status(400).json({
                success: false,
                message: 'La lista de productos es requerida y debe contener al menos un producto'
            });
        }

        // Calcular totales
        const subtotal = productos.reduce((sum, p) => sum + (p.precioUnitario * p.cantidad), 0);
        const iva = subtotal * 0.10;
        const total = subtotal + iva;

        log(`Subtotal: ${subtotal}, IVA: ${iva}, Total: ${total}`);

        // Crear objeto de venta
        const ventaData = {
            productos: productos.map(p => ({
                productoId: p.productoId,
                nombre: p.nombre,
                precioUnitario: p.precioUnitario,
                cantidad: p.cantidad,
                subtotal: p.precioUnitario * p.cantidad
            })),
            subtotal,
            iva,
            total,
            metodoPago: metodoPago || 'efectivo',
            cliente: cliente || null,
            vendedor: req.username, // Asumiendo que el middleware verifyToken agrega esto
            fechaVenta: admin.firestore.FieldValue.serverTimestamp(),
            estado: 'completada'
        };

        log("Datos de venta preparados:", ventaData);

        // Usar transacción para asegurar consistencia
        await db.runTransaction(async (transaction) => {
            log("Iniciando transacción...");

            // 1. Leer todos los documentos necesarios antes de realizar cualquier escritura
            const productosRefs = productos.map(p => db.collection('inventario').doc(p.productoId));
            const productosDocs = await Promise.all(productosRefs.map(ref => transaction.get(ref)));

            // 2. Verificar y actualizar inventario
            productosDocs.forEach((productoDoc, index) => {
                if (!productoDoc.exists) {
                    throw new Error(`Producto ${productos[index].productoId} no encontrado`);
                }

                const productoData = productoDoc.data();
                const nuevaCantidad = productoData.cantidad - productos[index].cantidad;

                if (nuevaCantidad < 0) {
                    throw new Error(`No hay suficiente stock para ${productoData.nombre}`);
                }

                transaction.update(productosRefs[index], {
                    cantidad: nuevaCantidad,
                    fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
                });

                log(`Actualizado inventario para ${productoData.nombre}: ${productoData.cantidad} -> ${nuevaCantidad}`);
            });

            // 3. Registrar la venta
            const ventaRef = db.collection('ventas').doc(); // Genera un ID automáticamente
            transaction.set(ventaRef, ventaData);
            log(`Venta registrada con ID: ${ventaRef.id}`);
        });

        log("Venta registrada exitosamente");
        return res.status(201).json({
            success: true,
            message: 'Venta registrada exitosamente',
            data: ventaData
        });

    } catch (error) {
        log(`Error al registrar venta: ${error.message}`);
        console.error("Detalles técnicos:", {
            errorCode: error.code,
            errorMessage: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

        return res.status(500).json({
            success: false,
            message: 'Error al procesar la venta',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && {
                technicalDetails: {
                    code: error.code,
                    message: error.message
                }
            })
        });
    }
};

/**
 * Obtener historial de ventas
 */
const getHistorialVentas = async (req, res) => {
    try {
        console.log('Obteniendo historial de ventas...');

        let query = db.collection('ventas').orderBy('fechaVenta', 'desc');

        // Filtros opcionales
        if (req.query.fechaInicio && req.query.fechaFin) {
            const fechaInicio = new Date(req.query.fechaInicio);
            const fechaFin = new Date(req.query.fechaFin);
            fechaFin.setHours(23, 59, 59, 999); // Ajustar para incluir todo el día

            query = query.where('fechaVenta', '>=', fechaInicio)
                .where('fechaVenta', '<=', fechaFin);
        }

        if (req.query.vendedor) {
            query = query.where('vendedor', '==', req.query.vendedor);
        }

        if (req.query.metodoPago) {
            query = query.where('metodoPago', '==', req.query.metodoPago);
        }

        // Limitar resultados si es necesario
        if (req.query.limit) {
            query = query.limit(parseInt(req.query.limit));
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            console.log('No se encontraron ventas');
            return res.status(404).json({
                success: false,
                message: 'No se encontraron ventas'
            });
        }

        const ventas = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                fechaVenta: data.fechaVenta.toDate().toISOString()
            };
        });

        console.log('Ventas encontradas:', ventas.length);

        return res.status(200).json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error('Error al obtener historial de ventas:', error);
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
 * Obtener detalles de una venta específica
 */
const getVentaById = async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`Obteniendo venta con ID: ${id}`);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la venta es requerido'
            });
        }

        const ventaRef = db.collection('ventas').doc(id);
        const ventaDoc = await ventaRef.get();

        if (!ventaDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }

        const ventaData = ventaDoc.data();

        // Obtener información adicional de productos si es necesario
        const productosConDetalles = await Promise.all(
            ventaData.productos.map(async producto => {
                const productoRef = db.collection('inventario').doc(producto.productoId);
                const productoDoc = await productoRef.get();
                return {
                    ...producto,
                    productoDetalles: productoDoc.exists ? productoDoc.data() : null
                };
            })
        );

        const ventaCompleta = {
            id: ventaDoc.id,
            ...ventaData,
            productos: productosConDetalles,
            fechaVenta: ventaData.fechaVenta.toDate().toISOString()
        };

        console.log('Venta encontrada:', ventaCompleta.id);

        return res.status(200).json({
            success: true,
            data: ventaCompleta
        });

    } catch (error) {
        console.error('Error al obtener la venta:', error);
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

module.exports = {
    getProductosActivos,
    registrarVenta,
    getHistorialVentas,
    getVentaById
};