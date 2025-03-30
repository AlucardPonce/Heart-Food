const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
        message.error('Solo puedes subir archivos de imagen!');
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
        message.error('La imagen debe ser menor a 5MB!');
    }
    return isImage && isLt5M;
};

// Prepara un producto para edición
const prepareProductoForEdit = (record) => {
    // Prepara los valores para el formulario
    const formValues = {
        nombre: record.nombre,
        precioPublico: record.precioPublico,
        precioCompra: record.precioCompra,
        categoria: record.categoria,
        cantidad: record.cantidad,
        codigoBarras: record.codigoBarras,
        descripcion: record.descripcion,
        proveedor: record.proveedor,
        minimoStock: record.minimoStock,
        status: record.status,
        imagenUrlAnterior: record.imagenUrl // Guarda la URL anterior
    };

    // Si hay imagen existente, prepara el campo de subida
    if (record.imagenUrl) {
        formValues.imagen = [{
            uid: '-1',
            name: 'imagen-actual',
            status: 'done',
            url: record.imagenUrl
        }];
    }

    return formValues;
};

export { beforeUpload, prepareProductoForEdit };