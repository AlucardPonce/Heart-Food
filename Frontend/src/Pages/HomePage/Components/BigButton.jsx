import React from 'react';
import classNames from 'classnames';
import '../../../styles/BigButton.css'; // Importar estilos del BigButton

const BigButton = ({ label, style }) => {
    const buttonClass = classNames('big-button', style); // Usar classnames para combinar clases
    return (
        <button className={buttonClass}>
            {label}
        </button>
    );
};

export default BigButton;