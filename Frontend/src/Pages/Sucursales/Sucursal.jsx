import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from 'leaflet';
import { Input, Button, Card, List, Space, Typography, Table, Modal, Form, Divider, message } from "antd";
import { SearchOutlined, EnvironmentOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "leaflet/dist/leaflet.css";

// Configuración del icono del marcador
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const { Title, Text } = Typography;
const { Column } = Table;

const MapClickHandler = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e);
        },
    });
    return null;
};

const reverseGeocode = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error en reverse geocoding:", error);
        return null;
    }
};

const parseAddressComponents = (displayName, address) => {
    // Si no hay address, intentamos extraer información del display_name
    if (!address) {
        const parts = displayName.split(',');
        return {
            direccion: parts[0]?.trim() || "",
            calle: parts[0]?.trim() || "",
            colonia: parts[1]?.trim() || "",
            municipio: parts[2]?.trim() || parts[1]?.trim() || "",
            estado: parts[3]?.trim() || parts[2]?.trim() || "",
            cp: parts[parts.length - 2]?.trim() || ""
        };
    }

    return {
        direccion: displayName,
        calle: [address.road, address.house_number].filter(Boolean).join(' ') || displayName.split(',')[0],
        colonia: address.neighbourhood || address.suburb || address.city_district || "",
        municipio: address.city || address.town || address.village || address.county || "",
        estado: address.state || "",
        cp: address.postcode || ""
    };
};

const EditableMap = ({ markers, setMarkers, setTableData, setActiveMarker, form, setIsModalVisible }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const mapRef = useRef();

    const updateTableData = (markersData) => {
        setTableData(markersData.map((marker, index) => ({
            key: marker.id,
            no: index + 1,
            nombreSucursal: `Sucursal ${index + 1}`,
            colonia: marker.colonia,
            municipio: marker.municipio,
            estado: marker.estado,
            calle: marker.calle,
            cp: marker.cp,
            numero: marker.numero,
            acciones: marker.id
        })));
    };

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
                id: Date.now(),
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
            updateTableData([...markers, newMarker]);
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
            updateTableData(updatedMarkers);
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
                id: Date.now(),
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

            setMarkers([...markers, newMarker]);
            updateTableData([...markers, newMarker]);
            setActiveMarker(newMarker);
            form.setFieldsValue(newMarker);
            setIsModalVisible(true);
        } catch (error) {
            console.error("Error al obtener detalles de ubicación:", error);

            const newMarker = {
                id: Date.now(),
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

            setMarkers([...markers, newMarker]);
            updateTableData([...markers, newMarker]);
            setActiveMarker(newMarker);
            form.setFieldsValue(newMarker);
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
                                form.setFieldsValue(marker);
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
                                            form.setFieldsValue(marker);
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
                                            updateTableData(updatedMarkers);
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

const Sucursal = () => {
    const [markers, setMarkers] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [activeMarker, setActiveMarker] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const handleSave = () => {
        form.validateFields().then(values => {
            const updatedMarkers = markers.map(marker => {
                if (marker.id === activeMarker.id) {
                    return {
                        ...marker,
                        ...values,
                        nombreSucursal: values.nombreSucursal || marker.nombreSucursal
                    };
                }
                return marker;
            });

            setMarkers(updatedMarkers);
            setTableData(updatedMarkers.map((marker, index) => ({
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

            setIsModalVisible(false);
            message.success("Cambios guardados correctamente");
        });
    };

    const handleDelete = (id) => {
        const updatedMarkers = markers.filter(marker => marker.id !== id);
        setMarkers(updatedMarkers);
        setTableData(updatedMarkers.map((marker, index) => ({
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
        message.success("Sucursal eliminada correctamente");
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 24,
                maxWidth: '100%'
            }}>
                <Card style={{
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    <Title level={4} style={{ textAlign: "center", marginBottom: 20 }}>
                        <EnvironmentOutlined /> Mapa de Sucursales
                    </Title>
                    <EditableMap
                        markers={markers}
                        setMarkers={setMarkers}
                        setTableData={setTableData}
                        setActiveMarker={setActiveMarker}
                        form={form}
                        setIsModalVisible={setIsModalVisible}
                    />
                </Card>

                <Card style={{
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '500px',
                    overflow: 'hidden'
                }}>
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
                            <Column title="NO." dataIndex="no" key="no" width={60} />
                            <Column title="Nombre de la sucursal" dataIndex="nombreSucursal" key="nombreSucursal" />
                            <Column title="Colonia" dataIndex="colonia" key="colonia" />
                            <Column title="Municipio" dataIndex="municipio" key="municipio" />
                            <Column title="Estado" dataIndex="estado" key="estado" />
                            <Column title="Calle" dataIndex="calle" key="calle" />
                            <Column title="CP" dataIndex="cp" key="cp" width={80} />
                            <Column title="Número" dataIndex="numero" key="numero" width={80} />
                            <Column
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
                                                    form.setFieldsValue(marker);
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
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                const mapContainer = document.querySelector('.leaflet-container');
                                mapContainer._leaflet_map.flyTo([19.4326, -99.1332], 5);
                            }}
                            style={{ width: '100%' }}
                        >
                            Centrar Mapa
                        </Button>
                    </div>
                </Card>
            </div>

            <Modal
                title={`${activeMarker ? 'Editar' : 'Nueva'} Sucursal`}
                open={isModalVisible}
                onOk={handleSave}
                onCancel={() => setIsModalVisible(false)}
                okText="Guardar"
                cancelText="Cancelar"
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="position"
                        label="Ubicación (Latitud, Longitud)"
                        rules={[{ required: true, message: 'La ubicación es requerida' }]}
                    >
                        <Input disabled />
                    </Form.Item>

                    <Form.Item
                        name="nombreSucursal"
                        label="Nombre de la sucursal"
                        rules={[{ required: true, message: 'Por favor ingresa el nombre de la sucursal' }]}
                    >
                        <Input placeholder="Ejemplo: Sucursal Centro" />
                    </Form.Item>

                    <Form.Item
                        name="calle"
                        label="Calle"
                        rules={[{ required: true, message: 'Por favor ingresa la calle' }]}
                    >
                        <Input placeholder="Ejemplo: Av. Juárez" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="numero" label="Número" style={{ width: 120 }}>
                            <Input placeholder="Ejemplo: 123" />
                        </Form.Item>
                        <Form.Item name="colonia" label="Colonia" style={{ flex: 1 }}>
                            <Input placeholder="Ejemplo: Centro" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="municipio" label="Municipio" style={{ flex: 1 }}>
                            <Input placeholder="Ejemplo: Cuauhtémoc" />
                        </Form.Item>
                        <Form.Item name="estado" label="Estado" style={{ flex: 1 }}>
                            <Input placeholder="Ejemplo: Ciudad de México" />
                        </Form.Item>
                    </div>

                    <Form.Item name="cp" label="Código Postal" style={{ width: 200 }}>
                        <Input placeholder="Ejemplo: 06000" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Sucursal;