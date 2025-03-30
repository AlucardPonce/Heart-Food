import React from 'react';
import { Form, Input, InputNumber, Select, Button, Upload, Divider, Switch } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
const { Option } = Select;

const ProductoForm = ({
    form,
    editingId,
    categorias,
    handleSubmit,
    onCategoriaCreate,
    onCancel,
    beforeUpload
}) => {
    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
                minimoStock: 5,
                status: 'activo'
            }}
        >
            {/* Campo para subir imagen */}
            <Form.Item
                name="imagen"
                label="Imagen del Producto"
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                    if (Array.isArray(e)) {
                        return e;
                    }
                    return e && e.fileList;
                }}
            >
                <Upload
                    name="imagen"
                    listType="picture-card"
                    maxCount={1}
                    beforeUpload={beforeUpload}
                    onRemove={() => {
                        form.setFieldsValue({ imagen: [] });
                    }}
                    onChange={({ fileList }) => {
                        form.setFieldsValue({ imagen: fileList });
                    }}
                >
                    {(!form.getFieldValue('imagen') || form.getFieldValue('imagen').length === 0) && (
                        <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Subir imagen</div>
                        </div>
                    )}
                </Upload>
            </Form.Item>

            {/* Campo oculto para guardar la URL anterior de la imagen */}
            {editingId && (
                <Form.Item name="imagenUrlAnterior" hidden>
                    <Input type="hidden" />
                </Form.Item>
            )}

            <Form.Item
                name="nombre"
                label="Nombre del Producto"
                rules={[{ required: true, message: 'Por favor ingresa el nombre' }]}
            >
                <Input placeholder="Ej. Laptop HP EliteBook" />
            </Form.Item>

            <Form.Item
                name="descripcion"
                label="Descripción"
            >
                <Input.TextArea rows={3} placeholder="Descripción detallada del producto" />
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                    name="categoria"
                    label="Categoría"
                    style={{ flex: 1 }}
                    rules={[{ required: true, message: 'Selecciona una categoría' }]}
                >
                    <Select
                        placeholder="Selecciona una categoría"
                        loading={categorias.length === 0}
                        dropdownRender={menu => (
                            <>
                                {menu}
                                <Divider style={{ margin: '8px 0' }} />
                                <div style={{ padding: '0 8px 4px' }}>
                                    <Button
                                        type="text"
                                        icon={<PlusOutlined />}
                                        onClick={onCategoriaCreate}
                                    >
                                        Crear nueva categoría
                                    </Button>
                                </div>
                            </>
                        )}
                    >
                        {categorias.map(cat => (
                            <Option key={cat.id} value={cat.id}>{cat.nombre}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="codigoBarras"
                    label="Código de Barras"
                    style={{ flex: 1 }}
                >
                    <Input placeholder="Opcional" />
                </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                    name="precioCompra"
                    label="Precio de Compra"
                    style={{ flex: 1 }}
                    rules={[{ required: true, message: 'Ingresa el precio de compra' }]}
                >
                    <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                </Form.Item>

                <Form.Item
                    name="precioPublico"
                    label="Precio Público"
                    style={{ flex: 1 }}
                    rules={[{ required: true, message: 'Ingresa el precio público' }]}
                >
                    <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                    name="cantidad"
                    label="Cantidad en Stock"
                    style={{ flex: 1 }}
                    rules={[{ required: true, message: 'Ingresa la cantidad disponible' }]}
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                    name="minimoStock"
                    label="Mínimo en Stock"
                    style={{ flex: 1 }}
                    tooltip="Se mostrará alerta cuando el stock esté por debajo de este número"
                >
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </div>

            <Form.Item
                name="proveedor"
                label="Proveedor"
            >
                <Input placeholder="Nombre del proveedor" />
            </Form.Item>

            {editingId && (
                <Form.Item
                    name="status"
                    label="Estado"
                    valuePropName="checked"
                >
                    <Switch
                        checkedChildren="Activo"
                        unCheckedChildren="Inactivo"
                    />
                </Form.Item>
            )}

            <Form.Item style={{ textAlign: 'right' }}>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                    Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                    {editingId ? 'Actualizar' : 'Crear'}
                </Button>
            </Form.Item>
        </Form>
    );
};

export default ProductoForm;