import React from 'react';
import { Modal, Form, Input, Typography } from 'antd';
import axios from 'axios';

const { Text } = Typography;

const SucursalFormModal = ({ isModalVisible, setIsModalVisible, activeMarker, handleSave }) => {
    const [form] = Form.useForm();

    React.useEffect(() => {
        if (activeMarker) {
            form.setFieldsValue({
                ...activeMarker,
                position: activeMarker.position
            });
        } else {
            form.resetFields();
        }
    }, [activeMarker, form]);

    const onFinish = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                position: {
                    lat: values.position[0],
                    lng: values.position[1]
                }
            };

            // Ahora todas las solicitudes son por POST y con JSON en el body
            await axios.post('/api/sucursales', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            handleSave(payload);
            setIsModalVisible(false);
        } catch (error) {
            console.error("Validation error:", error);
        }
    };

    return (
        <Modal
            title={`${activeMarker ? 'Editar' : 'Nueva'} Sucursal`}
            open={isModalVisible}
            onOk={onFinish}
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
    );
};

export default SucursalFormModal;
