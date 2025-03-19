import React from 'react';
import BigButton from './Components/BigButton';
import { Link } from 'react-router-dom';
import '../../styles/HomePage.css';

const HomePage = () => {
    return (
        <div>
            <div className='titulo'><h1>Bienvenido!</h1></div>
            <div className="content">
                <Link to={"/home/sucursales"}>
                    <BigButton style="sucursal" label="SUCURSALES" />
                </Link>
                <Link to={"/home/graficas"}>
                    <BigButton style="graficas" label="GRÁFICAS" />
                </Link>
                <Link to={"/home/inventario"}>
                    <BigButton style="inv" label="INVENTARIO" />
                </Link>
                <Link to={"/home/producto"}>
                    <BigButton label="PRODUCTO" />
                </Link>
            </div>
        </div>
    );
};

export default HomePage;