import React from 'react';
import { Table, Button, Popconfirm, Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

const SucursalesTable = ({ sucursales, onDelete, onEdit }) => {
    const columns = [
        {
            title: 'Nombre',
            dataIndex: 'nombreSucursal',
            key: 'nombre',
            sorter: (a, b) => a.nombreSucursal.localeCompare(b.nombreSucursal),
        },
        {
            title: 'Dirección',
            dataIndex: 'direccion',
            key: 'direccion',
        },
        {
            title: 'Teléfono',
            dataIndex: 'telefono',
            key: 'telefono',
        },
        {
            title: 'Horario',
            dataIndex: 'horario',
            key: 'horario',
        },
        {
            title: 'Ubicación',
            key: 'ubicacion',
            render: (_, record) => (
                <span>
                    {record.position.lat.toFixed(4)}, {record.position.lng.toFixed(4)}
                </span>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'activa' ? 'green' : 'red'}>
                    {status.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(record)}
                    />
                    <Popconfirm
                        title="¿Eliminar esta sucursal?"
                        onConfirm={() => onDelete(record.id)}
                        okText="Sí"
                        cancelText="No"
                    >
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={sucursales}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
        />
    );
};

export default SucursalesTable;