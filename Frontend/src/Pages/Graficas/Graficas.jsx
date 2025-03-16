import React from 'react';
import Ventas from './components/ventas';
import './components/Styles/grafica.css';
import Btn from './components/button';

const Graficas = () => {
    return (
        <div className="graficas-container"> {/* Clase única aquí */}
            <div className='content'>
                <div className="parent1">
                    <div className="div1">Gráfica de Querétaro</div>
                    <div className="div2"><Ventas></Ventas></div>
                    <div className="div3"><Btn></Btn></div>
                </div>
            </div>
        </div>
    );
};

export default Graficas;
