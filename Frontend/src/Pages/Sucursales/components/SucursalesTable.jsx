import React from 'react';
import { Table, Button, Space, Card, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

const SucursalesTable = ({ tableData, loading, markers, setActiveMarker, setIsModalVisible, handleDelete }) => {
    return (
        <Card
            style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '500px',
                overflow: 'hidden'
            }}
            loading={loading}
        >
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Table
                    dataSource={tableData}
                    pagination={false}
                    scroll={{ y: 400 }}
                    locale={{
                        emptyText: (
                            <div style={{
                                padding: '40px 0',
                                textAlign: 'center',
                                color: 'rgba(0,0,0,0.25)'
                            }}>
                                No hay sucursales registradas.<br />
                                Agrega una haciendo clic en el mapa.
                            </div>
                        )
                    }}
                    style={{ borderRadius: 8 }}
                >
                    <Table.Column title="NO." dataIndex="no" key="no" width={60} />
                    <Table.Column title="Nombre de la sucursal" dataIndex="nombreSucursal" key="nombreSucursal" />
                    <Table.Column title="Colonia" dataIndex="colonia" key="colonia" />
                    <Table.Column title="Municipio" dataIndex="municipio" key="municipio" />
                    <Table.Column title="Estado" dataIndex="estado" key="estado" />
                    <Table.Column title="Calle" dataIndex="calle" key="calle" />
                    <Table.Column title="CP" dataIndex="cp" key="cp" width={80} />
                    <Table.Column title="Número" dataIndex="numero" key="numero" width={80} />
                    <Table.Column
                        title="Acciones"
                        key="acciones"
                        width={120}
                        render={(_, record) => (
                            <Space size="small">
                                <Button
                                    type="link"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        const marker = markers.find(m => m.id === record.key);
                                        if (marker) {
                                            setActiveMarker(marker);
                                            setIsModalVisible(true);
                                            const mapContainer = document.querySelector('.leaflet-container');
                                            mapContainer._leaflet_map.flyTo(marker.position, 15);
                                        }
                                    }}
                                />
                                <Button
                                    type="link"
                                    icon={<DeleteOutlined />}
                                    danger
                                    onClick={() => handleDelete(record.key)}
                                />
                            </Space>
                        )}
                    />
                </Table>
            </div>

            <div style={{
                padding: '16px 0 0 0',
                borderTop: '1px solid #f0f0f0',
                marginTop: 'auto'
            }}>

            </div>
        </Card>
    );
};

export default SucursalesTable;