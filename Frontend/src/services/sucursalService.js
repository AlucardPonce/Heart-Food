import apiClient from './interceptor';

export const getSucursales = async () => {
    try {
        const response = await apiClient.get('/sucursales');
        return response.data.data;
    } catch (error) {
        console.error('Error fetching sucursales:', error);
        throw error;
    }
};

export const addSucursal = async (sucursalData) => {
    try {
        const response = await apiClient.post('/sucursales', sucursalData);
        return response.data;
    } catch (error) {
        console.error('Error adding sucursal:', error);
        throw error;
    }
};

export const updateSucursal = async (sucursalData) => {
    try {
        const response = await apiClient.post('/sucursales/update', sucursalData);
        return response.data;
    } catch (error) {
        console.error('Error updating sucursal:', error);
        throw error;
    }
};

export const deleteSucursal = async (id) => {
    try {
        const response = await apiClient.delete(`/sucursales/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting sucursal:', error);
        throw error;
    }
};