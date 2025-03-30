import React from 'react';
import { Table, Button, Input, Space, Image, Tag, Switch, Dropdown, Menu } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, EditOutlined, MoreOutlined, DeleteOutlined } from '@ant-design/icons';

const ProductosTab = ({
    productos,
    categorias,
    loading,
    searchText,
    handleSearch,
    handleEditProducto,
    handleToggleStatus,
    handleDeletePermanente,
    onAddProducto,
    refreshData
}) => {
    const filteredProductos = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
        producto.descripcion.toLowerCase().includes(searchText.toLowerCase()) ||
        (producto.codigoBarras && producto.codigoBarras.includes(searchText))
    );

    const columns = [
        {
            title: 'Imagen',
            dataIndex: 'imagenUrl',
            key: 'imagen',
            render: (url) => (
                url ? (
                    <Image
                        width={50}
                        height={50}
                        src={url}
                        style={{ borderRadius: 4, objectFit: 'cover' }}
                        preview={{
                            mask: <span>Ver imagen</span>
                        }}
                    />
                ) : (
                    <div style={{
                        width: 50,
                        height: 50,
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4
                    }}>
                        <span style={{ color: '#999' }}>Sin imagen</span>
                    </div>
                )
            )
        },
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
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (text, record) => (
                <Switch
                    checked={text === 'activo'}
                    onChange={() => handleToggleStatus(record.id, text)}
                    checkedChildren="Activo"
                    unCheckedChildren="Inactivo"
                />
            ),
            filters: [
                { text: 'Activos', value: 'activo' },
                { text: 'Inactivos', value: 'inactivo' },
            ],
            onFilter: (value, record) => record.status === value,
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
                    <Dropdown
                        overlay={
                            <Menu>
                                <Menu.Item
                                    key="delete-permanent"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeletePermanente(record.id)}
                                >
                                    Eliminar Permanentemente
                                </Menu.Item>
                            </Menu>
                        }
                    >
                        <Button icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <>
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
                        onClick={refreshData}
                    >
                        Recargar
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onAddProducto}
                    >
                        Nuevo Producto
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={filteredProductos}
                rowKey="id"
                loading={loading}
                scroll={{ x: true }}
                bordered
            />
        </>
    );
};

export default ProductosTab;