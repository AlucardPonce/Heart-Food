import React from 'react';
import Options from './components/optionbar';
import Bto from './components/button';
import './components/styles/styles.css'

const Sucursal = () => {
    return (
        <div className="sucursal-container"> {/* Añadir una clase única aquí */}
            <div className='titulo'>
                <h2>Sucursales</h2>
            </div>
            <div className='content'>
                <div className="parent">
                    <div className="div1">
                        <h2>Seleccione un Municipio:</h2>
                        <Options placeholder="Seleccione un municipio por favor" label1="Querétaro" label2="Chihuahua" />
                    </div>

                    <div className="div2">
                        <h2>Seleccione un Estado:</h2>
                        <Options placeholder="Seleccione un municipio por favor" label1="Querétaro" label2="Chihuahua" />
                    </div>

                    <div className="div3">
                        <table className="tg">
                            <thead>
                                <tr>
                                    <th className="tg-0lax">NO.</th>
                                    <th className="tg-0lax">MUNICIPIO</th>
                                    <th className="tg-0lax">ESTADO</th>
                                    <th className="tg-0lax">COLONIA</th>
                                    <th className="tg-0lax">CP</th>
                                    <th className="tg-0lax">Numero</th>
                                    <th className="tg-0lax">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="tg-0lax"></td>
                                    <td className="tg-hmp3"></td>
                                    <td className="tg-0lax"></td>
                                    <td className="tg-hmp3"></td>
                                    <td className="tg-0lax"></td>
                                    <td className="tg-hmp3"></td>
                                    <td className="tg-0lax"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="div4">
                        <Bto label="Agregar sucursal" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sucursal;
