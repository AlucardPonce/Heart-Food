import React from 'react';
import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const CategoriasTab = ({ categorias, productos, loading, onAddCategoria }) => {
    const columns = [
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
        <>
            <div style={{ marginBottom: 20, textAlign: 'right' }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onAddCategoria}
                >
                    Nueva Categoría
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={categorias}
                rowKey="id"
                loading={loading}
                bordered
            />
        </>
    );
};

export default CategoriasTab;