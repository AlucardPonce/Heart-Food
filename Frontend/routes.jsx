import { Routes, Route } from 'react-router-dom';
import Login from './src/Pages/Login/LoginPage';
import MainLayout from './src/Layouts/MainLayout';
import HomePage from './src/Pages/HomePage/HomePage';
import Graficas from './src/Pages/Graficas/Graficas';
import Producto from './src/Pages/ProductoVenta/ProductoVenta';
import Inventario from './src/Pages/Inventario/Inventario';
import Sucursal from './src/Pages/Sucursales/Sucursal';
import ProtectedRoute from './src/components/ProtectedRoute'; // Importar el componente de protección

const AppRoutes = () => {
    return (
        <Routes>
            {/* Ruta pública */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas */}
            <Route
                path="/home"
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<HomePage />} />
                <Route
                    path="graficas"
                    element={
                        <ProtectedRoute>
                            <Graficas />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="producto"
                    element={
                        <ProtectedRoute>
                            <Producto />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="inventario"
                    element={
                        <ProtectedRoute>
                            <Inventario />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="sucursales"
                    element={
                        <ProtectedRoute>
                            <Sucursal />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
};

export default AppRoutes;