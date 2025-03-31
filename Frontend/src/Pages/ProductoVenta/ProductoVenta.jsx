import React, { useState, useEffect } from 'react';
import { Card, Button, InputNumber, Space, Row, Col, Divider, Typography, Modal, message, Spin } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, CheckOutlined } from '@ant-design/icons';
import apiClient from '../../services/interceptor'; // Asegúrate de que la ruta sea correcta
import './components/styles/producto.css';
import EventEmitter from './components/EvenEmitter';

const { Title, Text } = Typography;

const Producto = () => {
    const [productos, setProductos] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [saleLoading, setSaleLoading] = useState(false);

    // Obtener productos del backend
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await apiClient.get('/productos-activos');
                console.log('Response data:', response.data); // Verifica la estructura aquí
                const productsData = Array.isArray(response.data.data)
                    ? response.data.data.map(product => ({
                        ...product,
                        cantidadSeleccionada: 0
                    }))
                    : [];
                setProductos(productsData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching products: ", error);
                message.error('Error al cargar los productos');
                setLoading(false);
            }
        };

        fetchProducts();

        // Escucha el evento de actualización de stock
        const handleStockUpdated = (updatedProducts) => {
            setProductos(prevProductos =>
                prevProductos.map(product => {
                    const vendido = updatedProducts.find(p => p.id === product.id);
                    if (vendido) {
                        return {
                            ...product,
                            cantidad: product.cantidad - vendido.cantidadSeleccionada
                        };
                    }
                    return product;
                })
            );
        };

        EventEmitter.subscribe('stockUpdated', handleStockUpdated);

        return () => {
            // Limpia el listener
            EventEmitter.events['stockUpdated'] = EventEmitter.events['stockUpdated'].filter(
                callback => callback !== handleStockUpdated
            );
        };
    }, []);

    // Manejar cambio de cantidad
    const handleQuantityChange = (productId, value) => {
        const product = productos.find(p => p.id === productId);

        if (value > product.cantidad) {
            message.warning(`La cantidad ingresada excede el stock disponible (${product.cantidad}).`);
            return;
        }

        setProductos(prevProducts =>
            prevProducts.map(product =>
                product.id === productId
                    ? { ...product, cantidadSeleccionada: value }
                    : product
            )
        );

        // Actualizar productos seleccionados
        if (value > 0) {
            setSelectedProducts(prev => {
                const existingProduct = prev.find(p => p.id === productId);
                if (existingProduct) {
                    return prev.map(p =>
                        p.id === productId ? { ...p, cantidadSeleccionada: value } : p
                    );
                } else {
                    const productToAdd = productos.find(p => p.id === productId);
                    return [...prev, { ...productToAdd, cantidadSeleccionada: value }];
                }
            });
        } else {
            setSelectedProducts(prev => prev.filter(p => p.id !== productId));
        }
    };

    // Calcular totales
    const calcularTotales = () => {
        const subtotal = selectedProducts.reduce(
            (sum, product) => sum + (product.precioPublico * product.cantidadSeleccionada),
            0
        );
        const iva = subtotal * 0.10;
        const total = subtotal + iva;

        return { subtotal, iva, total };
    };

    const { subtotal, iva, total } = calcularTotales();

    // Procesar venta
    const procesarVenta = async () => {
        if (selectedProducts.length === 0) {
            message.warning('Selecciona al menos un producto');
            return;
        }

        setIsModalVisible(true);
    };

    // Confirmar venta
    const confirmarVenta = async () => {
        setSaleLoading(true);

        try {
            // Validar que ningún producto exceda el stock disponible
            const productosExcedidos = selectedProducts.filter(p => p.cantidadSeleccionada > p.cantidad);
            if (productosExcedidos.length > 0) {
                const nombresProductos = productosExcedidos.map(p => p.nombre).join(', ');
                message.error(`La cantidad seleccionada excede el stock disponible para: ${nombresProductos}`);
                setSaleLoading(false);
                return;
            }

            const ventaData = {
                productos: selectedProducts.map(p => ({
                    productoId: p.id,
                    nombre: p.nombre,
                    precioUnitario: p.precioPublico,
                    cantidad: p.cantidadSeleccionada,
                    subtotal: p.precioPublico * p.cantidadSeleccionada
                })),
                subtotal,
                iva,
                total
            };

            console.log("Datos de venta preparados:", ventaData);

            const response = await apiClient.post('/ventas', ventaData);

            // Emite un evento para actualizar el stock
            EventEmitter.emit('stockUpdated', selectedProducts);

            message.success('Venta registrada con éxito');
            setSelectedProducts([]);
            setProductos(prev =>
                prev.map(p => ({ ...p, cantidadSeleccionada: 0 }))
            );
            setIsModalVisible(false);

        } catch (error) {
            console.error("Error al procesar venta: ", error);
            message.error(`Error al procesar venta: ${error.response?.data?.message || error.message}`);
        } finally {
            setSaleLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Spin size="large" tip="Cargando productos...">
                    <div style={{ height: '100px' }}></div> {/* Contenedor anidado */}
                </Spin>
            </div>
        );
    }

    return (
        <div className="productos-container">
            <Title level={2} className="page-title">
                <ShoppingCartOutlined /> Punto de Venta
            </Title>

            {/* Resumen de la venta */}
            <div className="sale-summary">
                <Card title="Resumen de Venta" variant="outlined">
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Text strong>Subtotal:</Text>
                            </Col>
                            <Col span={16} style={{ textAlign: 'right' }}>
                                <Text>${subtotal.toFixed(2)}</Text>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Text strong>IVA (10%):</Text>
                            </Col>
                            <Col span={16} style={{ textAlign: 'right' }}>
                                <Text>${iva.toFixed(2)}</Text>
                            </Col>
                        </Row>
                        <Divider />
                        <Row gutter={16}>
                            <Col span={8}>
                                <Text strong type="success">Total:</Text>
                            </Col>
                            <Col span={16} style={{ textAlign: 'right' }}>
                                <Title level={4} type="success">${total.toFixed(2)}</Title>
                            </Col>
                        </Row>
                        <Button
                            type="primary"
                            size="large"
                            icon={<CheckOutlined />}
                            onClick={procesarVenta}
                            disabled={selectedProducts.length === 0}
                            block
                        >
                            Procesar Venta
                        </Button>
                    </Space>
                </Card>
            </div>

            {/* Listado de productos */}
            <Divider orientation="left">Productos Disponibles</Divider>
            <Row gutter={[16, 16]}>
                {productos.map(product => (
                    <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                        <Card
                            hoverable
                            cover={
                                product.imagenUrl ? (
                                    <div className="product-image-container">
                                        <img
                                            alt={product.nombre}
                                            src={product.imagenUrl}
                                            className="product-image"
                                        />
                                    </div>
                                ) : (
                                    <div className="product-image-placeholder">
                                        <ShoppingCartOutlined style={{ fontSize: '48px', color: '#999' }} />
                                    </div>
                                )
                            }
                            actions={[
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text strong>${product.precioPublico.toFixed(2)}</Text>
                                    <Text type="secondary">Stock: {product.cantidad}</Text>
                                    <InputNumber
                                        min={0}
                                        max={product.cantidad}
                                        defaultValue={0}
                                        value={product.cantidadSeleccionada}
                                        onChange={(value) => handleQuantityChange(product.id, value)}
                                        style={{ width: '100%' }}
                                    />
                                </Space>
                            ]}
                        >
                            <Card.Meta
                                title={product.nombre}
                                description={
                                    <Text ellipsis={{ tooltip: product.descripcion }}>
                                        {product.descripcion || 'Sin descripción'}
                                    </Text>
                                }
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Modal de confirmación */}
            <Modal
                title="Confirmar Venta"
                open={isModalVisible} // Cambiado de "visible"
                onOk={confirmarVenta}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={saleLoading}
                okText="Confirmar Venta"
                cancelText="Cancelar"
            >
                <div style={{ marginBottom: '16px' }}>
                    <Title level={4}>Resumen de la Venta</Title>
                    {selectedProducts.map(product => (
                        <div key={product.id} style={{ marginBottom: '8px' }}>
                            <Text strong>{product.nombre}</Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>
                                    {product.cantidadSeleccionada} x ${product.precioPublico.toFixed(2)}
                                </Text>
                                <Text>
                                    ${(product.cantidadSeleccionada * product.precioPublico).toFixed(2)}
                                </Text>
                            </div>
                        </div>
                    ))}
                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Subtotal:</Text>
                        <Text>${subtotal.toFixed(2)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>IVA (10%):</Text>
                        <Text>${iva.toFixed(2)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong type="success">Total:</Text>
                        <Text strong type="success">${total.toFixed(2)}</Text>
                    </div>
                </div>
                <Text type="warning">
                    ¿Estás seguro de que deseas procesar esta venta? Esta acción no se puede deshacer.
                </Text>
            </Modal>
        </div>
    );
};

export default Producto;
