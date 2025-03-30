import React, { useState, useEffect } from 'react';
import { Modal, Form, message, Card, Tabs } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import apiClient from '../../services/interceptor';

// Import components
import ProductoForm from './components/ProductoForm';
import CategoriaForm from './components/CategoriaForm';
import ProductosTab from './components/ProductosTab';
import CategoriasTab from './components/CategoriasTab';
import { beforeUpload, prepareProductoForEdit } from './components/utils/inventarioUtil';

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

    useEffect(() => {
        fetchProductos();
        fetchCategorias();
    }, []);

    // Refrescar datos
    const refreshData = () => {
        fetchProductos();
        fetchCategorias();
    };

    // Crear categoría
    const handleCreateCategoria = async (values) => {
        try {
            const response = await apiClient.post('/productos/insert-categoria', values);
            message.success('Categoría creada exitosamente');
            fetchCategorias();
            setCategoriaModalVisible(false);
            formCategoria.resetFields();
            
            // Si estábamos creando categoría desde el modal de producto, volvemos a él
            if (activeTab === '1') {
                setProductoModalVisible(true);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Error al crear la categoría');
        }
    };

    // Crear producto
    const handleCreateProducto = async (values) => {
        try {
            const formData = new FormData();
            
            // Agregar todos los campos del formulario
            Object.keys(values).forEach(key => {
                if (key === 'imagen' && values[key]?.[0]?.originFileObj) {
                    formData.append('imagen', values.imagen[0].originFileObj);
                } else if (key !== 'imagen') {
                    formData.append(key, values[key]);
                }
            });

            const response = await apiClient.post('/productos', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            message.success('Producto creado exitosamente');
            fetchProductos();
            setProductoModalVisible(false);
            formProducto.resetFields();
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message.includes('imagen')) {
                message.error('Error al subir la imagen: ' + error.response.data.message);
            } else {
                message.error(error.response?.data?.message || 'Error al crear el producto');
            }
        }
    };

    // Actualizar producto
    const handleUpdateProducto = async (values) => {
        try {
            const formData = new FormData();

            // Agregar todos los campos del formulario
            Object.keys(values).forEach(key => {
                if (key === 'imagen' && values[key]?.[0]?.originFileObj) {
                    formData.append('imagen', values.imagen[0].originFileObj); // Nueva imagen
                } else if (key !== 'imagen') {
                    formData.append(key, values[key]);
                }
            });

            formData.append('id', editingId);

            // Incluir la URL anterior para eliminación si es necesario
            if (values.imagenUrlAnterior && (!values.imagen || values.imagen.length === 0)) {
                formData.append('imagenUrlAnterior', values.imagenUrlAnterior);
            }

            await apiClient.post('/productos/update', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            message.success('Producto actualizado exitosamente');
            fetchProductos();
            setProductoModalVisible(false);
            formProducto.resetFields();
            setEditingId(null);
        } catch (error) {
            message.error(error.response?.data?.message || 'Error al actualizar el producto');
        }
    };

    // Eliminación permanente
    const handleDeletePermanente = async (id) => {
        Modal.confirm({
            title: '¿Eliminar permanentemente este producto?',
            content: 'Esta acción no se puede deshacer y borrará todos los registros del producto',
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await apiClient.post('/productos/delete-permanent', { id });
                    message.success('Producto eliminado permanentemente');
                    // Actualización optimista
                    setProductos(prev => prev.filter(p => p.id !== id));
                } catch (error) {
                    message.error(error.response?.data?.message || 'Error al eliminar');
                }
            }
        });
    };

    // Cambiar estado (activar/desactivar)
    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const { data } = await apiClient.post('/productos/toggle-status', { id });
            message.success(`Producto ${data.newStatus === 'activo' ? 'activado' : 'desactivado'}`);
            
            // Actualización optimista del estado
            setProductos(prev => prev.map(p => 
                p.id === id ? { ...p, status: data.newStatus } : p
            ));
        } catch (error) {
            message.error(error.response?.data?.message || 'Error al cambiar estado');
        }
    };

    const handleEditProducto = (record) => {
        setEditingId(record.id);
        formProducto.setFieldsValue(prepareProductoForEdit(record));
        setProductoModalVisible(true);
    };

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const openProductoModal = () => {
        setEditingId(null);
        formProducto.resetFields();
        setProductoModalVisible(true);
    };

    const openCategoriaModal = () => {
        setCategoriaModalVisible(true);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div><h1>Inventario</h1></div>
            <Card>
                <Tabs defaultActiveKey="1" onChange={(key) => setActiveTab(key)}>
                    <TabPane tab={
                        <span>
                            <TagsOutlined />
                            Productos
                        </span>
                    } key="1">
                        <ProductosTab 
                            productos={productos}
                            categorias={categorias}
                            loading={loading}
                            searchText={searchText}
                            handleSearch={handleSearch}
                            handleEditProducto={handleEditProducto}
                            handleToggleStatus={handleToggleStatus}
                            handleDeletePermanente={handleDeletePermanente}
                            onAddProducto={openProductoModal}
                            refreshData={refreshData}
                        />
                    </TabPane>

                    <TabPane tab={
                        <span>
                            <TagsOutlined />
                            Categorías
                        </span>
                    } key="2">
                        <CategoriasTab 
                            categorias={categorias}
                            productos={productos}
                            loading={loading}
                            onAddCategoria={openCategoriaModal}
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
                <ProductoForm 
                    form={formProducto}
                    editingId={editingId}
                    categorias={categorias}
                    handleSubmit={editingId ? handleUpdateProducto : handleCreateProducto}
                    onCategoriaCreate={() => {
                        setProductoModalVisible(false);
                        setCategoriaModalVisible(true);
                    }}
                    onCancel={() => {
                        setProductoModalVisible(false);
                        formProducto.resetFields();
                        setEditingId(null);
                    }}
                    beforeUpload={beforeUpload}
                />
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
                <CategoriaForm 
                    form={formCategoria}
                    onFinish={handleCreateCategoria}
                    onCancel={() => {
                        setCategoriaModalVisible(false);
                        formCategoria.resetFields();
                    }}
                    activeTab={activeTab}
                />
            </Modal>
        </div>
    );
};

export default Inventario;
