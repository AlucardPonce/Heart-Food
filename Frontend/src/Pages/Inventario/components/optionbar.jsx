import React from 'react';
import { Select } from 'antd';
import './styles/styles.css';

const Options = ({ label1, label2, placeholder }) => {
    return (
        <Select className='SucursalSelect'
            style={{ marginBottom: 20 }}
            placeholder={placeholder}
        >
            <Select.Option>
                {label1}
            </Select.Option>
            <Select.Option>
                {label2}
            </Select.Option>
        </Select>
    );
};

export default Options;