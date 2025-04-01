import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';

const AddSucursalModal = ({ visible, onCancel, onSubmit, initialValues }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (initialValues) {
            form.setFieldsValue({
                nombreSucursal: initialValues.nombreSucursal,
                direccion: initialValues.direccion,
                telefono: initialValues.telefono,
                horario: initialValues.horario,
                lat: initialValues.position.lat,
                lng: initialValues.position.lng,
            });
        } else {
            form.resetFields();
        }
    }, [initialValues, form]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();

            const sucursalData = {
                nombreSucursal: values.nombreSucursal,
                direccion: values.direccion,
                telefono: values.telefono,
                horario: values.horario,
                position: {
                    lat: parseFloat(values.lat),
                    lng: parseFloat(values.lng),
                },
            };

            if (initialValues && initialValues.id) {
                sucursalData.id = initialValues.id;
                await onSubmit(sucursalData, true);
            } else {
                await onSubmit(sucursalData, false);
            }

            form.resetFields();
            onCancel();
        } catch (error) {
            message.error('Error al validar los datos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={initialValues ? "Editar Sucursal" : "Agregar Nueva Sucursal"}
            visible={visible}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancelar
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    loading={loading}
                    onClick={handleSubmit}
                >
                    {initialValues ? "Actualizar" : "Agregar"}
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="nombreSucursal"
                    label="Nombre de la Sucursal"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item name="direccion" label="Dirección">
                    <Input />
                </Form.Item>
                <Form.Item name="telefono" label="Teléfono">
                    <Input />
                </Form.Item>
                <Form.Item name="horario" label="Horario" initialValue="9:00 - 18:00">
                    <Input />
                </Form.Item>
                <Form.Item
                    name="lat"
                    label="Latitud"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <Input type="number" step="any" />
                </Form.Item>
                <Form.Item
                    name="lng"
                    label="Longitud"
                    rules={[{ required: true, message: 'Este campo es requerido' }]}
                >
                    <Input type="number" step="any" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddSucursalModal;