import { Navigate, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

const ProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const [isValid, setIsValid] = useState(null); // Estado para verificar la validez del token
    const token = localStorage.getItem("token"); // Obtener el token del almacenamiento local

    // Función para cerrar sesión y redirigir al login
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("Sesión cerrada por inactividad o token inválido");
        navigate("/login", { replace: true });
    }, [navigate]);

    // Validar el token con el backend
    useEffect(() => {
        const validateToken = async () => {
            try {
                //const response = await fetch("https://heart-food-back.onrender.com/validate-token", {
                    const response = await fetch("http://localhost:3001/validate-token", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    setIsValid(true); // Token válido
                } else {
                    logout(); // Token inválido o expirado
                }
            } catch (error) {
                console.error("Error al validar el token:", error);
                logout(); // Error en la validación
            }
        };

        if (token) {
            validateToken();
        } else {
            logout(); // Si no hay token, cerrar sesión
        }
    }, [token, logout]);

    if (isValid === null) {
        return <div>Cargando...</div>; // Mostrar un indicador de carga mientras se valida el token
    }

    if (!isValid) {
        return <Navigate to="/login" replace />; // Redirigir al login si el token no es válido
    }

    return children; // Renderizar el contenido protegido si el token es válido
};

export default ProtectedRoute;