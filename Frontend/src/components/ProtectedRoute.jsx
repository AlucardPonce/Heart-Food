import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ requiredRoles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Cargando...</div>; 
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(user.rol)) {
        return <Navigate to="/home" replace />; 
    }

    return <Outlet />;
};

export default ProtectedRoute;