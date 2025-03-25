// services/sucursalApi.js
import axios from 'axios';

// Configuración con token hardcoded
const API_URL = 'http://localhost:3001'; // o tu URL base
const HARDCODED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJhZG1pbiIsImlhdCI6MTYxNTIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const api = axios.create({
    baseURL: API_URL,
});

// Interceptor con token hardcoded
api.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${HARDCODED_TOKEN}`;
    return config;
});

export const getSucursales = async () => {
    try {
        const response = await api.get('/sucursales');
        return response.data.data;
    } catch (error) {
        console.error('Error fetching sucursales:', error);
        throw error;
    }
};

export const saveSucursal = async (sucursalData) => {
    try {
        const response = await api.post('/sucursales', sucursalData);
        return response.data.data;
    } catch (error) {
        console.error('Error saving sucursal:', error);
        throw error;
    }
};

export const deleteSucursal = async (id) => {
    try {
        await api.delete(`/sucursales/${id}`);
    } catch (error) {
        console.error('Error deleting sucursal:', error);
        throw error;
    }
};

export default api;