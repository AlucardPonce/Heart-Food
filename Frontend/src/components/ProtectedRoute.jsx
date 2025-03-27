import { useEffect, useState } from 'react';
import { Navigate, Outlet } from "react-router-dom";
import { authService } from '../services/api'; // Importa tu servicio de autenticación

const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        // Verificación más completa que solo el token
        const checkAuth = async () => {
            const isValid = authService.isAuthenticated();
            setIsAuthenticated(isValid);
            
            if (!isValid) {
                localStorage.removeItem('token');
            }
        };
        
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div>Cargando...</div>; // O un spinner
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;