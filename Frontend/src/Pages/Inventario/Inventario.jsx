import React, { useState, useEffect } from 'react';
import { Table, Button, Spin, message, Select, Modal, Form, Input, InputNumber } from 'antd';
import api from '../../services/api';
import './components/styles/styles.css';

const { Option } = Select;

const ProductoModal = ({ visible, onCancel, onSave, product, categorias }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (product) {
            form.setFieldsValue(product);
        } else {
            form.resetFields();
        }
    }, [product, form]);

    return (
        <Modal
            title={product ? "Editar Producto" : "Agregar Producto"}
            visible={visible}
            onOk={() => form.submit()}
            onCancel={onCancel}
        >
            <Form form={form} onFinish={onSave} layout="vertical">
                <Form.Item name="id" hidden>
                    <Input />
                </Form.Item>
                <Form.Item
                    name="nombre"
                    label="Nombre del Producto"
                    rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="categoriaId"
                    label="Categoría"
                    rules={[{ required: true, message: 'Seleccione una categoría' }]}
                >
                    <Select placeholder="Seleccione una categoría">
                        {categorias.map(cat => (
                            <Option key={cat.id} value={cat.id}>{cat.nombre}</Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    name="precioPublico"
                    label="Precio Público"
                    rules={[{ required: true, message: 'Ingrese el precio' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    name="precioEmpresa"
                    label="Precio Empresa"
                    rules={[{ required: true, message: 'Ingrese el precio' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                    name="cantidad"
                    label="Cantidad"
                    rules={[{ required: true, message: 'Ingrese la cantidad' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="activo" valuePropName="checked" initialValue={true}>
                    <Input type="checkbox" /> Activo
                </Form.Item>
            </Form>
        </Modal>
    );
};

const Inventario = () => {
    const [inventario, setInventario] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [catResponse, invResponse] = await Promise.all([
                    api.get('/categorias'),
                    api.get('/inventario')
                ]);
                setCategorias(catResponse.data.data);
                setInventario(invResponse.data.data);
            } catch (error) {
                message.error('Error al cargar datos: ' + (error.response?.data?.intMessage || error.message));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddProduct = () => {
        setCurrentProduct(null);
        setModalVisible(true);
    };

    const handleEditProduct = (product) => {
        setCurrentProduct(product);
        setModalVisible(true);
    };

    const handleSaveProduct = async (values) => {
        try {
            setLoading(true);
            if (values.id) {
                await api.put(`/inventario/${values.id}`, values);
                message.success('Producto actualizado correctamente');
            } else {
                await api.post('/inventario', values);
                message.success('Producto agregado correctamente');
            }
            const response = await api.get('/inventario');
            setInventario(response.data.data);
            setModalVisible(false);
        } catch (error) {
            message.error('Error al guardar: ' + (error.response?.data?.intMessage || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await api.delete(`/inventario/${id}`);
            message.success('Producto eliminado correctamente');
            const response = await api.get('/inventario');
            setInventario(response.data.data);
        } catch (error) {
            message.error('Error al eliminar: ' + (error.response?.data?.intMessage || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCategoriaChange = async (value) => {
        setSelectedCategoria(value);
        try {
            setLoading(true);
            const response = value
                ? await api.get(`/inventario?categoriaId=${value}`)
                : await api.get('/inventario');
            setInventario(response.data.data);
        } catch (error) {
            message.error('Error al filtrar inventario: ' + (error.response?.data?.intMessage || error.message));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'NO.',
            key: 'no',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Nombre del producto',
            dataIndex: 'nombre',
            key: 'nombre',
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
        },
        {
            title: 'Precio Público',
            dataIndex: 'precioPublico',
            key: 'precioPublico',
            render: (precio) => `$${precio?.toFixed(2) || '0.00'}`,
        },
        {
            title: 'Existencias',
            key: 'existencias',
            render: (_, record) => record.cantidad > 0 ? 'Disponible' : 'Agotado',
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'activo',
            render: (activo) => (
                <span style={{ color: activo ? 'green' : 'red' }}>
                    {activo ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            title: 'ACCIONES',
            key: 'acciones',
            render: (_, record) => (
                <div className="acciones-container">
                    <Button type="link" size="small" onClick={() => handleEditProduct(record)}>
                        Editar
                    </Button>
                    <Button
                        type="link"
                        danger
                        size="small"
                        onClick={() => handleDelete(record.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="inventario-container">
            <div className='titulo'>
                <h2>Inventario de {user?.sucursal || 'Querétaro'}</h2>
            </div>

            <Spin spinning={loading}>
                <div className='content'>
                    <div className="filtros-container">
                        <div className="filtro-categoria">
                            <h3>Seleccione una categoría:</h3>
                            <Select
                                placeholder="Seleccione una categoría"
                                style={{ width: 250 }}
                                onChange={handleCategoriaChange}
                                value={selectedCategoria}
                                allowClear
                            >
                                {categorias.map(cat => (
                                    <Option key={cat.id} value={cat.id}>
                                        {cat.nombre}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="tabla-container">
                        <Table
                            columns={columns}
                            dataSource={inventario}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            bordered
                            className="inventario-table"
                        />
                    </div>

                    <div className="acciones-footer">
                        <Button type="primary" onClick={handleAddProduct}>
                            Agregar producto
                        </Button>
                    </div>
                </div>
            </Spin>

            <ProductoModal
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onSave={handleSaveProduct}
                product={currentProduct}
                categorias={categorias}
            />
        </div>
    );
};

export default Inventario;