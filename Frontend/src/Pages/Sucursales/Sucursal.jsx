import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getSucursales, addSucursal, updateSucursal, deleteSucursal } from '../../services/sucursalService';
import MapComponent from './components/MapComponent';
import SucursalesTable from './components/SucursalesTable';
import SearchBar from './components/SearchBar';
import AddSucursalModal from './components/AddSucursalModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SucursalPage = () => {
    const [sucursales, setSucursales] = useState([]);
    const [filteredSucursales, setFilteredSucursales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSucursal, setSelectedSucursal] = useState(null);
    const [editingSucursal, setEditingSucursal] = useState(null);

    useEffect(() => {
        fetchSucursales();
    }, []);

    const fetchSucursales = async () => {
        try {
            setLoading(true);
            const data = await getSucursales();
            setSucursales(data);
            setFilteredSucursales(data);
        } catch (error) {
            message.error('Error al cargar las sucursales');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (searchText) => {
        if (!searchText) {
            setFilteredSucursales(sucursales);
            return;
        }

        const filtered = sucursales.filter(sucursal =>
            sucursal.nombreSucursal.toLowerCase().includes(searchText.toLowerCase()) ||
            (sucursal.direccion && sucursal.direccion.toLowerCase().includes(searchText.toLowerCase())) ||
            (sucursal.telefono && sucursal.telefono.includes(searchText))
        );
        setFilteredSucursales(filtered);
    };

    const handleMapClick = (latlng) => {
        setEditingSucursal({
            position: { lat: latlng.lat, lng: latlng.lng }
        });
        setModalVisible(true);
    };

    const handleAddSucursal = async (sucursalData, isEditing) => {
        try {
            if (isEditing) {
                await updateSucursal(sucursalData);
                message.success('Sucursal actualizada correctamente');
            } else {
                await addSucursal(sucursalData);
                message.success('Sucursal agregada correctamente');
            }
            fetchSucursales();
        } catch (error) {
            message.error('Error al guardar la sucursal');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSucursal(id);
            message.success('Sucursal eliminada correctamente');
            fetchSucursales();
        } catch (error) {
            message.error('Error al eliminar la sucursal');
        }
    };

    const handleEdit = (sucursal) => {
        setEditingSucursal(sucursal);
        setModalVisible(true);
        setSelectedSucursal(sucursal);
    };

    return (
        <div style={{ padding: '24px' }}>
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card
                        title="Gestión de Sucursales"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingSucursal(null);
                                    setModalVisible(true);
                                }}
                            >
                                Agregar Sucursal
                            </Button>
                        }
                    >
                        <SearchBar onSearch={handleSearch} />
                        <SucursalesTable
                            sucursales={filteredSucursales}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            loading={loading}
                        />
                    </Card>
                </Col>
                <Col span={24}>
                    <Card title="Mapa de Sucursales">
                        <MapComponent
                            sucursales={filteredSucursales}
                            onMapClick={handleMapClick}
                            selectedSucursal={selectedSucursal}
                        />
                    </Card>
                </Col>
            </Row>

            <AddSucursalModal
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingSucursal(null);
                }}
                onSubmit={handleAddSucursal}
                initialValues={editingSucursal}
            />
        </div>
    );
};

export default SucursalPage;