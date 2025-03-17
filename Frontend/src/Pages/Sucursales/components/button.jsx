import React from 'react';
import { Button, Select, Input, Message, Modal, Form, List } from 'antd';
import './styles/sucursal.css';

const Bto = ({ label }) => {
    return (
        <Button type="primary">{label}</Button>
    );
}

export default Bto;