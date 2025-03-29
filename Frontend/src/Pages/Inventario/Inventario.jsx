import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Card, Space, Typography, Tag, Popconfirm, Divider, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, TagsOutlined } from '@ant-design/icons';
import apiClient from '../../services/interceptor'; // Asegúrate de que la ruta sea correcta
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Inventario = () => {
    // Estados para productos
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [productoModalVisible, setProductoModalVisible] = useState(false);
    const [formProducto] = Form.useForm();
    const [editingId, setEditingId] = useState(null);
    const [searchText, setSearchText] = useState('');

    // Estados para categorías
    const [categoriaModalVisible, setCategoriaModalVisible] = useState(false);
    const [formCategoria] = Form.useForm();
    const [activeTab, setActiveTab] = useState('1');

    // Obtener productos
    const fetchProductos = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/productos');
            setProductos(response.data.data);
        } catch (error) {
            message.error('Error al cargar los productos');
        } finally {
            setLoading(false);
        }
    };

    // Obtener categorías
    const fetchCategorias = async () => {
        try {
            const response = await apiClient.get('/productos/get-categorias');
            setCategorias(response.data.data);
        } catch (error) {
            message.error('Error al cargar las categorías');
        }
    };

    // Crear categoría
    const handleCreateCategoria = async (values) => {
        try {
            const response = await apiClient.post('/productos/insert-categoria', values);
            message.success('Categoría creada exitosamente');
            fetchCategorias();
            setCategoriaModalVisible(false);
            formCategoria.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Error al crear la categoría');
        }
    };

    // Operaciones CRUD para productos
    const handleCreateProducto = async (values) => {
        try {
            const response = await apiClient.post('/productos', values);
            message.success('Producto creado exitosamente');
            fetchProductos();
            setProductoModalVisible(false);
            formProducto.resetFields();
        } catch (error) {
            message.error('Error al crear el producto');
        }
    };

    const handleUpdateProducto = async (values) => {
        try {
            await apiClient.post('/productos/update', { ...values, id: editingId });
            message.success('Producto actualizado exitosamente');
            fetchProductos();
            setProductoModalVisible(false);
            formProducto.resetFields();
            setEditingId(null);
        } catch (error) {
            message.error('Error al actualizar el producto');
        }
    };

    const handleDeleteProducto = async (id) => {
        try {
            await apiClient.post('/productos/delete', { id });
            message.success('Producto eliminado exitosamente');
            fetchProductos();
        } catch (error) {
            message.error('Error al eliminar el producto');
        }
    };

    const handleEditProducto = (record) => {
        setEditingId(record.id);
        formProducto.setFieldsValue({
            nombre: record.nombre,
            precioPublico: record.precioPublico,
            precioCompra: record.precioCompra,
            categoria: record.categoria,
            cantidad: record.cantidad,
            codigoBarras: record.codigoBarras,
            descripcion: record.descripcion,
            proveedor: record.proveedor,
            minimoStock: record.minimoStock
        });
        setProductoModalVisible(true);
    };

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const filteredProductos = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
        producto.descripcion.toLowerCase().includes(searchText.toLowerCase()) ||
        (producto.codigoBarras && producto.codigoBarras.includes(searchText))
    );

    // Columnas para la tabla de productos
    const columnsProductos = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        },
        {
            title: 'Precio Público',
            dataIndex: 'precioPublico',
            key: 'precioPublico',
            render: (text) => `$${text.toFixed(2)}`,
            sorter: (a, b) => a.precioPublico - b.precioPublico,
        },
        {
            title: 'Categoría',
            dataIndex: 'categoria',
            key: 'categoria',
            render: (text) => {
                const categoria = categorias.find(cat => cat.id === text);
                return categoria ? categoria.nombre : 'Sin categoría';
            },
        },
        {
            title: 'Stock',
            dataIndex: 'cantidad',
            key: 'cantidad',
            render: (text, record) => (
                <Tag color={text < (record.minimoStock || 5) ? 'red' : 'green'}>
                    {text} {text < (record.minimoStock || 5) && '(Bajo stock)'}
                </Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEditProducto(record)}
                    />
                    <Popconfirm
                        title="¿Eliminar este producto?"
                        onConfirm={() => handleDeleteProducto(record.id)}
                        okText="Sí"
                        cancelText="No"
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Columnas para la tabla de categorías
    const columnsCategorias = [
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (text) => (
                <Tag color={text === 'activo' ? 'green' : 'red'}>
                    {text === 'activo' ? 'Activo' : 'Inactivo'}
                </Tag>
            ),
        },
        {
            title: 'Productos',
            key: 'productCount',
            render: (_, record) => (
                <Tag>
                    {productos.filter(p => p.categoria === record.id).length} productos
                </Tag>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Tabs defaultActiveKey="1" onChange={(key) => setActiveTab(key)}>
                    <TabPane tab={
                        <span>
                            <TagsOutlined />
                            Productos
                        </span>
                    } key="1">
                        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                            <Input.Search
                                placeholder="Buscar productos..."
                                allowClear
                                enterButton={<SearchOutlined />}
                                size="large"
                                style={{ width: 400 }}
                                onSearch={handleSearch}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <Space>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={() => {
                                        fetchProductos();
                                        fetchCategorias();
                                    }}
                                >
                                    Recargar
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setEditingId(null);
                                        formProducto.resetFields();
                                        setProductoModalVisible(true);
                                    }}
                                >
                                    Nuevo Producto
                                </Button>
                            </Space>
                        </div>

                        <Table
                            columns={columnsProductos}
                            dataSource={filteredProductos}
                            rowKey="id"
                            loading={loading}
                            scroll={{ x: true }}
                            bordered
                        />
                    </TabPane>

                    <TabPane tab={
                        <span>
                            <TagsOutlined />
                            Categorías
                        </span>
                    } key="2">
                        <div style={{ marginBottom: 20, textAlign: 'right' }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setCategoriaModalVisible(true)}
                            >
                                Nueva Categoría
                            </Button>
                        </div>

                        <Table
                            columns={columnsCategorias}
                            dataSource={categorias}
                            rowKey="id"
                            loading={loading}
                            bordered
                        />
                    </TabPane>
                </Tabs>
            </Card>

            {/* Modal para Productos */}
            <Modal
                title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
                visible={productoModalVisible}
                onCancel={() => {
                    setProductoModalVisible(false);
                    formProducto.resetFields();
                    setEditingId(null);
                }}
                footer={null}
                destroyOnClose
                width={700}
            >
                <Form
                    form={formProducto}
                    layout="vertical"
                    onFinish={editingId ? handleUpdateProducto : handleCreateProducto}
                    initialValues={{
                        minimoStock: 5
                    }}
                >
                    <Form.Item
                        name="nombre"
                        label="Nombre del Producto"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre' }]}
                    >
                        <Input placeholder="Ej. Laptop HP EliteBook" />
                    </Form.Item>

                    <Form.Item
                        name="descripcion"
                        label="Descripción"
                    >
                        <Input.TextArea rows={3} placeholder="Descripción detallada del producto" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            name="categoria"
                            label="Categoría"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'Selecciona una categoría' }]}
                        >
                            <Select
                                placeholder="Selecciona una categoría"
                                loading={categorias.length === 0}
                                dropdownRender={menu => (
                                    <>
                                        {menu}
                                        <Divider style={{ margin: '8px 0' }} />
                                        <div style={{ padding: '0 8px 4px' }}>
                                            <Button
                                                type="text"
                                                icon={<PlusOutlined />}
                                                onClick={() => {
                                                    setProductoModalVisible(false);
                                                    setCategoriaModalVisible(true);
                                                }}
                                            >
                                                Crear nueva categoría
                                            </Button>
                                        </div>
                                    </>
                                )}
                            >
                                {categorias.map(cat => (
                                    <Option key={cat.id} value={cat.id}>{cat.nombre}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="codigoBarras"
                            label="Código de Barras"
                            style={{ flex: 1 }}
                        >
                            <Input placeholder="Opcional" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            name="precioCompra"
                            label="Precio de Compra"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'Ingresa el precio de compra' }]}
                        >
                            <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="precioPublico"
                            label="Precio Público"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'Ingresa el precio público' }]}
                        >
                            <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            name="cantidad"
                            label="Cantidad en Stock"
                            style={{ flex: 1 }}
                            rules={[{ required: true, message: 'Ingresa la cantidad disponible' }]}
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="minimoStock"
                            label="Mínimo en Stock"
                            style={{ flex: 1 }}
                            tooltip="Se mostrará alerta cuando el stock esté por debajo de este número"
                        >
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="proveedor"
                        label="Proveedor"
                    >
                        <Input placeholder="Nombre del proveedor" />
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right' }}>
                        <Button onClick={() => setProductoModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancelar
                        </Button>
                        <Button type="primary" htmlType="submit">
                            {editingId ? 'Actualizar' : 'Crear'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal para Categorías */}
            <Modal
                title="Nueva Categoría"
                visible={categoriaModalVisible}
                onCancel={() => {
                    setCategoriaModalVisible(false);
                    formCategoria.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={formCategoria}
                    layout="vertical"
                    onFinish={handleCreateCategoria}
                >
                    <Form.Item
                        name="nombre"
                        label="Nombre de la Categoría"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre' }]}
                    >
                        <Input placeholder="Ej. Electrónica" />
                    </Form.Item>

                    <Form.Item
                        name="descripcion"
                        label="Descripción"
                    >
                        <Input.TextArea rows={3} placeholder="Descripción de la categoría" />
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right' }}>
                        <Button onClick={() => setCategoriaModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancelar
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            onClick={() => {
                                if (activeTab === '1') {
                                    setCategoriaModalVisible(false);
                                    setProductoModalVisible(true);
                                }
                            }}
                        >
                            Crear
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Inventario;