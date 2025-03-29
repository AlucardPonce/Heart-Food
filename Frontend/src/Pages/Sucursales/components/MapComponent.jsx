import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from 'leaflet';
import { Input, Button, Space, Typography, Divider, message } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "leaflet/dist/leaflet.css";
import api from '../../../services/interceptor';

const { Text, Title } = Typography;

// Configuración del icono del marcador
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const MapComponent = ({ markers, setMarkers, setTableData, setActiveMarker, setIsModalVisible }) => {

    const [searchQuery, setSearchQuery] = useState("");
    const mapRef = useRef();

    const handleMapClick = (e) => {
        // Verificar que el clic no sea en un marcador existente
        if (e.originalEvent.target.tagName === 'DIV' || e.originalEvent.target.tagName === 'IMG') {
            return;
        }

        const newMarker = {
            id: `temp-${Date.now()}`,
            nombreSucursal: "Nueva Sucursal",
            position: [e.latlng.lat, e.latlng.lng],
            calle: "",
            colonia: "",
            municipio: "",
            estado: "",
            cp: "",
            numero: "",
        };

        setMarkers(prevMarkers => [...(prevMarkers || []), newMarker]);
        setTableData(prevData => [...(prevData || []), newMarker]);
        setActiveMarker(newMarker);
        setIsModalVisible(true);
    };

    // Actualizar la ubicación en la base de datos al arrastrar el pin
    const handleMarkerDrag = async (id, newPosition) => {
        try {
            const payload = {
                id,
                position: {
                    lat: newPosition[0],
                    lng: newPosition[1],
                },
            };

            await api.post('/sucursales/update', payload);

            const updatedMarkers = markers.map(marker =>
                marker.id === id ? { ...marker, position: newPosition } : marker
            );

            setMarkers(updatedMarkers);
            setTableData(updatedMarkers);
            message.success("Ubicación actualizada correctamente");
        } catch (error) {
            console.error("Error al actualizar la ubicación:", error);
            message.error("Error al actualizar la ubicación");
        }
    };

    // Eliminar un pin y actualizar los nombres de los pines
    const handleDeleteMarker = async (id) => {
        try {
            await api.post('/sucursales/delete', { id });

            const updatedMarkers = markers.filter(marker => marker.id !== id);
            setMarkers(updatedMarkers);
            setTableData(updatedMarkers);
            message.success("Sucursal eliminada correctamente");
        } catch (error) {
            console.error("Error al eliminar la sucursal:", error);
            message.error("Error al eliminar la sucursal");
        }
    };

    const onFinish = async (values) => {
        try {
            // Asegúrate de que markers sea un array válido
            if (!Array.isArray(markers)) {
                throw new Error("El estado markers no es un array válido.");
            }

            await handleSave(values); // Llama a la función handleSave del componente padre
        } catch (error) {
            console.error("Error al guardar la sucursal:", error);
            message.error("Error al guardar la sucursal");
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <Space style={{ width: "100%", marginBottom: 16 }}>
                <Input
                    placeholder="Buscar dirección, ciudad o lugar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    allowClear
                    style={{ height: 40 }}
                />
                <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    style={{ height: 40 }}
                >
                    Buscar
                </Button>
            </Space>

            <MapContainer
                center={[19.4326, -99.1332]} // Coordenadas iniciales
                zoom={5}
                style={{
                    height: "400px",
                    width: "100%",
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid #f0f0f0'
                }}
                whenCreated={(map) => { mapRef.current = map; }}
                onClick={handleMapClick} // Configura el evento onClick
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {markers.map(marker => (
                    <Marker
                        key={marker.id}
                        position={marker.position}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                const newPosition = [e.target.getLatLng().lat, e.target.getLatLng().lng];
                                handleMarkerDrag(marker.id, newPosition);
                            },
                            click: () => {
                                setActiveMarker(marker);
                                setIsModalVisible(true);
                            }
                        }}
                    >
                        <Popup minWidth={300}>
                            <div>
                                <Title level={5} style={{ marginBottom: 8 }}>{marker.nombreSucursal}</Title>
                                <Divider style={{ margin: "8px 0" }} />

                                <Text strong>Calle: </Text>
                                <Text>{marker.calle || "No especificada"}</Text>
                                <br />

                                <Text strong>Número: </Text>
                                <Text>{marker.numero || "No especificado"}</Text>
                                <br />

                                <Text strong>Colonia: </Text>
                                <Text>{marker.colonia || "No especificada"}</Text>
                                <br />

                                <Text strong>Municipio: </Text>
                                <Text>{marker.municipio || "No especificado"}</Text>
                                <br />

                                <Text strong>Estado: </Text>
                                <Text>{marker.estado || "No especificado"}</Text>
                                <br />

                                <Text strong>Código Postal: </Text>
                                <Text>{marker.cp || "No especificado"}</Text>

                                <Divider style={{ margin: "12px 0" }} />

                                <Space>
                                    <Button
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setActiveMarker(marker);
                                            setIsModalVisible(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteMarker(marker.id)}
                                        danger
                                    >
                                        Eliminar
                                    </Button>
                                </Space>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;