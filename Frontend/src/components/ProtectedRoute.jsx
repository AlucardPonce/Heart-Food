import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";

const ProtectedRoute = ({ children }) => {
    const [authStatus, setAuthStatus] = useState('checking'); // 'checking', 'valid', 'invalid'
    const navigate = useNavigate();

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem("token");
            
            if (!token) {
                setAuthStatus('invalid');
                return;
            }

            try {
                // Verificación básica del formato del token antes de enviar al backend
                if (token.split('.').length !== 3) {
                    throw new Error('Token mal formado');
                }

                const response = await axios.get("http://localhost:3001/validate-token", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    validateStatus: (status) => status < 500 // Para manejar 401, 403, etc.
                });

                if (response.data.valid) {
                    setAuthStatus('valid');
                } else {
                    throw new Error('Token inválido');
                }
            } catch (error) {
                console.error("Error en validación de token:", {
                    error: error.message,
                    response: error.response?.data
                });
                handleLogout();
            }
        };

        const handleLogout = () => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setAuthStatus('invalid');
            // No uses alert en producción, mejor usa un sistema de notificaciones
            console.warn("Sesión cerrada por token inválido o expirado"); 
        };

        validateToken();
    }, [navigate]);

    if (authStatus === 'checking') {
        return <div>Cargando...</div>;
    }

    if (authStatus === 'invalid') {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;