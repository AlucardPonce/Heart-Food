import { Routes, Route } from "react-router-dom";
import Login from "./src/Pages/Login/LoginPage";
import MainLayout from "./src/Layouts/MainLayout";
import HomePage from "./src/Pages/HomePage/HomePage";
import ProtectedRoute from "./src/components/ProtectedRoute";
import Graficas from './src/Pages/Graficas/Graficas';
import Producto from './src/Pages/ProductoVenta/ProductoVenta';
import Inventario from './src/Pages/Inventario/Inventario';
import Sucursal from './src/Pages/Sucursales/Sucursal';

const AppRoutes = () => {
    return (
        <Routes>
            {/* Ruta pública */}
            <Route path="/" element={<Login />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
                <Route path="/home" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="graficas" element={<Graficas />} />
                    <Route path="producto" element={<Producto />} />
                    <Route path="inventario" element={<Inventario />} />
                    <Route path="sucursales" element={<Sucursal />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default AppRoutes;