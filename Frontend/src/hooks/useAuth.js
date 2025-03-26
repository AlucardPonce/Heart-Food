import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Importación corregida
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded); // Decodifica y establece el usuario
            } catch (error) {
                localStorage.removeItem('token');
                console.error('Token inválido:', error);
            }
        }

        setLoading(false);
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser(decoded);
        navigate('/home'); // Redirige al home después de iniciar sesión
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/'); // Redirige al login después de cerrar sesión
    };

    return { user, loading, login, logout };
};