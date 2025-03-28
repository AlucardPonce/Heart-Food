import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token"); // Verificar si el token existe

    if (!token) {
        return <Navigate to="/login" replace />; // Redirigir al login si no hay token
    }

    return children; // Renderizar el contenido protegido si el token existe
};

export default ProtectedRoute;