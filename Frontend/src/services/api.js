import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 10000,
});

// Interceptor para añadir token
api.interceptors.request.use((config) => {
    // Excluye endpoints públicos
    if (config.url === '/validate' || config.url === '/register') {
        return config;
    }

    const token = localStorage.getItem('token');

    if (token) {
        try {
            const decoded = jwtDecode(token);

            // Verifica expiración
            if (decoded.exp * 1000 < Date.now()) {
                throw new Error('Token expirado');
            }

            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error('Error con token:', error);
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject('Token inválido');
        }
    } else {
        window.location.href = '/login';
        return Promise.reject('No hay token');
    }

    return config;
});

// Interceptor de respuesta mejorado
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Evita loops en caso de reintento
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Intenta renovar el token (si implementas refresh tokens)
                const newToken = await attemptTokenRefresh();
                if (newToken) {
                    localStorage.setItem('token', newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error('Error renovando token:', refreshError);
            }

            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

// Servicio de autenticación mejorado
export const authService = {
    login: (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const decoded = jwtDecode(token);
            return decoded.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }
};

// Helper para renovación de token (opcional)
async function attemptTokenRefresh() {
    // Implementa lógica de refresh token si es necesario
    return null;
}

export default api;