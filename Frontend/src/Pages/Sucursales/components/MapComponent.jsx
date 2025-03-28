import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from 'leaflet';
import { Input, Button, Card, List, Space, Typography, Divider, message } from "antd";
import { SearchOutlined, EnvironmentOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "leaflet/dist/leaflet.css";
import { reverseGeocode, parseAddressComponents } from './utils';

const { Text, Title } = Typography;

// Configuración del icono del marcador
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const MapClickHandler = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e);
        },
    });
    return null;
};

const EditableMap = ({ markers, setMarkers, setTableData, setActiveMarker, setIsModalVisible }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const mapRef = useRef();

    const handleSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        setSuggestions([]);

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`;
            const response = await fetch(url);
            const data = await response.json();
            setSuggestions(data);

            if (data.length > 0) {
                const firstResult = data[0];
                mapRef.current.flyTo([parseFloat(firstResult.lat), parseFloat(firstResult.lon)], 15);
            }
        } catch (error) {
            console.error("Error fetching location data:", error);
            message.error("Error al buscar la ubicación");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectLocation = async (item) => {
        try {
            setIsLocationLoading(true);
            const geocodeData = await reverseGeocode(parseFloat(item.lat), parseFloat(item.lon));
            const address = geocodeData?.address || {};

            const { calle, colonia, municipio, estado, cp } = parseAddressComponents(item.display_name, address);

            const newMarker = {
                position: [parseFloat(item.lat), parseFloat(item.lon)],
                nombreSucursal: `Sucursal ${markers.length + 1}`,
                calle: calle,
                colonia: colonia,
                municipio: municipio,
                estado: estado,
                cp: cp,
                numero: address.house_number || "",
                direccion: item.display_name
            };

            setMarkers([...markers, newMarker]);
            setTableData([...markers, newMarker]);
            setSuggestions([]);
            setSearchQuery(calle);
            mapRef.current.flyTo(newMarker.position, 15);
        } catch (error) {
            console.error("Error al obtener detalles de la ubicación:", error);
            message.error("Error al procesar la ubicación seleccionada");
        } finally {
            setIsLocationLoading(false);
        }
    };

    const handleMarkerDrag = async (id, newPosition) => {
        setIsLocationLoading(true);
        try {
            const geocodeData = await reverseGeocode(newPosition[0], newPosition[1]);
            const address = geocodeData?.address || {};
            const { calle, colonia, municipio, estado, cp } = parseAddressComponents(
                geocodeData?.display_name || "Nueva ubicación",
                address
            );

            const updatedMarkers = markers.map(marker => {
                if (marker.id === id) {
                    return {
                        ...marker,
                        position: newPosition,
                        calle: calle,
                        colonia: colonia,
                        municipio: municipio,
                        estado: estado,
                        cp: cp,
                        numero: address.house_number || marker.numero,
                        direccion: geocodeData?.display_name || marker.direccion
                    };
                }
                return marker;
            });

            setMarkers(updatedMarkers);
            setTableData(updatedMarkers);
        } catch (error) {
            console.error("Error updating marker location:", error);
        } finally {
            setIsLocationLoading(false);
        }
    };

    const handleMapClick = async (e) => {
        setIsLocationLoading(true);
        try {
            const geocodeData = await reverseGeocode(e.latlng.lat, e.latlng.lng);
            const address = geocodeData?.address || {};
            const { calle, colonia, municipio, estado, cp } = parseAddressComponents(
                geocodeData?.display_name || "Nueva ubicación",
                address
            );

            const newMarker = {
                position: [e.latlng.lat, e.latlng.lng],
                nombreSucursal: `Sucursal ${markers.length + 1}`,
                calle: calle,
                colonia: colonia,
                municipio: municipio,
                estado: estado,
                cp: cp,
                numero: address.house_number || "",
                direccion: geocodeData?.display_name || "Nueva ubicación"
            };

            setActiveMarker(newMarker);
            setIsModalVisible(true);
        } catch (error) {
            console.error("Error al obtener detalles de ubicación:", error);

            const newMarker = {
                position: [e.latlng.lat, e.latlng.lng],
                nombreSucursal: `Sucursal ${markers.length + 1}`,
                calle: "",
                colonia: "",
                municipio: "",
                estado: "",
                cp: "",
                numero: "",
                direccion: "Nueva ubicación"
            };

            setActiveMarker(newMarker);
            setIsModalVisible(true);
        } finally {
            setIsLocationLoading(false);
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                <Input
                    placeholder="Buscar dirección, ciudad o lugar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onPressEnter={handleSearch}
                    allowClear
                    style={{ height: 40 }}
                />
                <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleSearch}
                    loading={loading}
                    style={{ height: 40 }}
                >
                    Buscar
                </Button>
            </Space.Compact>

            {suggestions.length > 0 && (
                <Card
                    style={{
                        marginBottom: 16,
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        maxHeight: '300px',
                        overflow: 'auto'
                    }}
                >
                    <List
                        size="small"
                        dataSource={suggestions}
                        renderItem={(item) => (
                            <List.Item
                                onClick={() => handleSelectLocation(item)}
                                style={{
                                    cursor: "pointer",
                                    padding: "8px 16px",
                                    transition: 'background-color 0.3s',
                                    ':hover': {
                                        backgroundColor: '#f5f5f5'
                                    }
                                }}
                            >
                                <div>
                                    <Text strong>{item.display_name.split(",")[0]}</Text>
                                    <Text type="secondary" style={{ display: "block" }}>
                                        {item.display_name.split(",").slice(1).join(",").trim()}
                                    </Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </Card>
            )}

            <MapContainer
                center={[19.4326, -99.1332]}
                zoom={5}
                style={{
                    height: "400px",
                    width: "100%",
                    borderRadius: 8,
                    marginBottom: 16,
                    border: '1px solid #f0f0f0'
                }}
                whenCreated={(map) => { mapRef.current = map; }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapClickHandler onClick={handleMapClick} />

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
                                        onClick={() => {
                                            const updatedMarkers = markers.filter(m => m.id !== marker.id);
                                            setMarkers(updatedMarkers);
                                            setTableData(updatedMarkers);
                                        }}
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

export default EditableMap;