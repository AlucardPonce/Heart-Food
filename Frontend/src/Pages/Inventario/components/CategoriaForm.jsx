import React from 'react';
import { Form, Input, Button } from 'antd';

const CategoriaForm = ({ form, onFinish, onCancel, activeTab }) => {
    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
        >
            <Form.Item
                name="nombre"
                label="Nombre de la Categoría"
                rules={[{ required: true, message: 'Por favor ingresa el nombre' }]}
            >
                <Input placeholder="Ej. Electrónica" />
            </Form.Item>

            <Form.Item
                name="descripcion"
                label="Descripción"
            >
                <Input.TextArea rows={3} placeholder="Descripción de la categoría" />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                    Cancelar
                </Button>
                <Button
                    type="primary"
                    htmlType="submit"
                >
                    Crear
                </Button>
            </Form.Item>
        </Form>
    );
};

export default CategoriaForm;