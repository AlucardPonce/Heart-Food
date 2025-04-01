import axios from "axios";
import { message } from "antd";

// Crear una instancia de Axios
const apiClient = axios.create({
    baseURL: "https://heart-food-back.onrender.com", // Cambia esto según tu backend
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor para solicitudes
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token"); // Obtener el token del almacenamiento local
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // Agregar el token al encabezado
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para respuestas
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            message.error("Sesión expirada. Por favor, inicia sesión nuevamente.");
            localStorage.removeItem("token"); // Eliminar el token
            window.location.href = "/login"; // Redirigir al login
        }
        return Promise.reject(error);
    }
);

export default apiClient;