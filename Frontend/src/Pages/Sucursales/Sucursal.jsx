import React, { useState, useEffect } from 'react';
import { Card, Typography, message, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import MapComponent from './components/MapComponent';
import SucursalesTable from './components/SucursalesTable';
import SucursalFormModal from './components/SucursalFormModal';

const { Title } = Typography;

const Sucursal = () => {
    const [markers, setMarkers] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [activeMarker, setActiveMarker] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    // Función para obtener sucursales
    const fetchSucursales = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sucursales');
            const sucursales = response.data.data || [];
            
            const sucursalesFormatted = sucursales.map(sucursal => ({
                ...sucursal,
                id: sucursal.id,
                position: [sucursal.position.lat, sucursal.position.lng]
            }));
            
            setMarkers(sucursalesFormatted);
            updateTableData(sucursalesFormatted);
        } catch (error) {
            console.error("Error cargando sucursales:", error);
            message.error("Error al cargar sucursales");
        } finally {
            setLoading(false);
        }
    };

    // Función para guardar sucursal
    const handleSaveSucursal = async (sucursalData) => {
        try {
            const response = sucursalData.id 
                ? await api.put(`/sucursales/${sucursalData.id}`, sucursalData)
                : await api.post('/sucursales', sucursalData);
            return response.data;
        } catch (error) {
            console.error("Error guardando sucursal:", error);
            throw error;
        }
    };

    useEffect(() => {
        fetchSucursales();
    }, []);

    const updateTableData = (markersData) => {
        setTableData(markersData.map((marker, index) => ({
            key: marker.id,
            no: index + 1,
            nombreSucursal: marker.nombreSucursal,
            colonia: marker.colonia,
            municipio: marker.municipio,
            estado: marker.estado,
            calle: marker.calle,
            cp: marker.cp,
            numero: marker.numero,
            acciones: marker.id
        })));
    };

    const handleSave = async (values) => {
        try {
            setLoading(true);
            const sucursalData = {
                ...values,
                position: {
                    lat: values.position[0],
                    lng: values.position[1]
                }
            };

            const savedSucursal = await handleSaveSucursal(sucursalData);
            const updatedMarkers = activeMarker?.id
                ? markers.map(marker =>
                    marker.id === activeMarker.id ? {
                        ...savedSucursal,
                        position: [savedSucursal.position.lat, savedSucursal.position.lng]
                    } : marker
                )
                : [...markers, {
                    ...savedSucursal,
                    position: [savedSucursal.position.lat, savedSucursal.position.lng]
                }];

            setMarkers(updatedMarkers);
            updateTableData(updatedMarkers);
            message.success(activeMarker?.id ? "Sucursal actualizada correctamente" : "Sucursal creada correctamente");
            setIsModalVisible(false);
        } catch (error) {
            message.error(error.response?.data?.intMessage || "Error al guardar la sucursal");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await api.delete(`/sucursales/${id}`);
            const updatedMarkers = markers.filter(marker => marker.id !== id);
            setMarkers(updatedMarkers);
            updateTableData(updatedMarkers);
            message.success("Sucursal eliminada correctamente");
        } catch (error) {
            message.error(error.response?.data?.intMessage || "Error al eliminar la sucursal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: 24,
            backgroundColor: '#f5f5f5',
            minHeight: '100vh',
            maxWidth: '100vw',
            overflowX: 'hidden'
        }}>
            <div style={{
                marginBottom: 24,
                padding: '16px 24px',
                backgroundColor: '#fff',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                maxWidth: '100%'
            }}>
                <Title level={3} style={{ margin: 0 }}>Sucursales</Title>
            </div>

            <Spin spinning={loading} tip="Cargando..." size="large" delay={300}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 24,
                    maxWidth: '100%'
                }}>
                    <Card
                        style={{
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            overflow: 'hidden'
                        }}
                    >
                        <Title level={4} style={{ textAlign: "center", marginBottom: 20 }}>
                            <EnvironmentOutlined /> Mapa de Sucursales
                        </Title>
                        <MapComponent
                            markers={markers}
                            setMarkers={setMarkers}
                            setTableData={updateTableData}
                            setActiveMarker={setActiveMarker}
                            setIsModalVisible={setIsModalVisible}
                        />
                    </Card>

                    <SucursalesTable 
                        tableData={tableData} 
                        loading={loading} 
                        markers={markers}
                        setActiveMarker={setActiveMarker}
                        setIsModalVisible={setIsModalVisible}
                        handleDelete={handleDelete}
                    />
                </div>
            </Spin>

            <SucursalFormModal 
                isModalVisible={isModalVisible}
                setIsModalVisible={setIsModalVisible}
                activeMarker={activeMarker}
                handleSave={handleSave}
            />
        </div>
    );
};

export default Sucursal;