import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001', // Asegúrate que coincida con tu URL de backend
});

// Interceptor para añadir el token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Exportamos la instancia configurada de axios
export default api;

// Métodos específicos para sucursales (opcional, puedes usar api directamente)
export const getSucursales = () => api.get('/sucursales');
export const saveSucursal = (sucursalData) =>
    sucursalData.id
        ? api.put(`/sucursales/${sucursalData.id}`, sucursalData)
        : api.post('/sucursales', sucursalData);
export const deleteSucursal = (id) => api.delete(`/sucursales/${id}`);