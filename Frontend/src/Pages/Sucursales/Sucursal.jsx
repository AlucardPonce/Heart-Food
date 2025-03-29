import React, { useState, useEffect } from 'react';
import { Card, Typography, message, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import MapComponent from './components/MapComponent';
import SucursalesTable from './components/SucursalesTable';
import SucursalFormModal from './components/SucursalFormModal';
import api from '../../services/interceptor';

const { Title } = Typography;

const Sucursal = () => {
    const [markers, setMarkers] = useState([]); // Estado para los pines del mapa
    const [tableData, setTableData] = useState([]); // Estado para los datos de la tabla
    const [activeMarker, setActiveMarker] = useState(null); // Estado para el marcador activo
    const [isModalVisible, setIsModalVisible] = useState(false); // Estado para mostrar/ocultar el modal
    const [loading, setLoading] = useState(true); // Estado para mostrar el spinner de carga

    // Función para obtener las sucursales desde el backend
    const fetchSucursales = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sucursales'); // Solicitud al backend
            const sucursales = response.data.data || [];

            // Formatear los datos para el mapa y la tabla
            const sucursalesFormatted = sucursales.map((sucursal) => ({
                ...sucursal,
                id: sucursal.id,
                position: [sucursal.position.lat, sucursal.position.lng],
            }));

            setMarkers(sucursalesFormatted); // Actualizar los pines del mapa
            updateTableData(sucursalesFormatted); // Actualizar los datos de la tabla
        } catch (error) {
            console.error("Error cargando sucursales:", error);
            message.error("Error al cargar sucursales");
        } finally {
            setLoading(false);
        }
    };

    // Función para actualizar los datos de la tabla
    const updateTableData = (markersData) => {
        setTableData(
            markersData.map((marker, index) => ({
                key: marker.id,
                no: index + 1,
                nombreSucursal: marker.nombreSucursal,
                colonia: marker.colonia,
                municipio: marker.municipio,
                estado: marker.estado,
                calle: marker.calle,
                cp: marker.cp,
                numero: marker.numero,
            }))
        );
    };

    // Cargar las sucursales al montar el componente
    useEffect(() => {
        fetchSucursales();
    }, []);

    // Función para guardar o actualizar una sucursal
    const handleSave = async (values) => {
        try {
            setLoading(true);

            // Formatear los datos para enviarlos al backend
            const sucursalData = {
                id: activeMarker?.id, // Incluir el ID si se está actualizando
                nombreSucursal: values.nombreSucursal,
                position: {
                    lat: values.position[0],
                    lng: values.position[1],
                },
                direccion: values.direccion || '',
                telefono: values.telefono || '',
                horario: values.horario || '9:00 - 18:00',
            };

            // Determinar si es una actualización o una nueva sucursal
            const response = activeMarker?.id
                ? await api.post('/sucursales/update', sucursalData) // Actualizar sucursal
                : await api.post('/sucursales', sucursalData); // Crear nueva sucursal

            const savedSucursal = response.data.data;

            // Actualizar el estado local
            const updatedMarkers = activeMarker?.id
                ? markers.map((marker) =>
                    marker.id === activeMarker.id
                        ? { ...savedSucursal, position: [savedSucursal.position.lat, savedSucursal.position.lng] }
                        : marker
                )
                : [...markers, { ...savedSucursal, position: [savedSucursal.position.lat, savedSucursal.position.lng] }];

            setMarkers(updatedMarkers); // Actualizar los pines del mapa
            updateTableData(updatedMarkers); // Actualizar los datos de la tabla

            // Mostrar mensaje de éxito
            message.success(activeMarker?.id ? "Sucursal actualizada correctamente" : "Sucursal creada correctamente");

            // Cerrar el modal
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error al guardar la sucursal:", error);
            message.error("Error al guardar la sucursal");
        } finally {
            setLoading(false);
        }
    };

    // Función para eliminar una sucursal
    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await api.post('/sucursales/delete', { id }); // Solicitud al backend para eliminar
            const updatedMarkers = markers.filter((marker) => marker.id !== id); // Filtrar los pines
            setMarkers(updatedMarkers); // Actualizar los pines del mapa
            updateTableData(updatedMarkers); // Actualizar los datos de la tabla
            message.success("Sucursal eliminada correctamente");
        } catch (error) {
            console.error("Error al eliminar la sucursal:", error);
            message.error("Error al eliminar la sucursal");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            {/* Título de la página */}
            <div style={{ marginBottom: 24, padding: '16px 24px', backgroundColor: '#fff', borderRadius: 8 }}>
                <Title level={3}>Sucursales</Title>
            </div>

            {/* Contenido principal */}
            <Spin spinning={loading} tip="Cargando...">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                    {/* Mapa de sucursales */}
                    <Card>
                        <Title level={4} style={{ textAlign: "center" }}>
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

                    {/* Tabla de sucursales */}
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

            {/* Modal para agregar/editar sucursales */}
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