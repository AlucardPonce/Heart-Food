import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
    const token = localStorage.getItem("token"); // Verifica si hay un token en el localStorage

    if (!token) {
        // Si no hay token, redirige al login
        return <Navigate to="/" replace />;
    }

    // Si hay token, permite el acceso a la ruta protegida
    return <Outlet />;
};

export default ProtectedRoute;