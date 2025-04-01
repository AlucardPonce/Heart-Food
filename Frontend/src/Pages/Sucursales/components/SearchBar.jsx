import React from 'react';
import { Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const SearchBar = ({ onSearch }) => {
    return (
        <Space style={{ marginBottom: 16, width: '100%' }}>
            <Input
                placeholder="Buscar sucursales..."
                prefix={<SearchOutlined />}
                onChange={(e) => onSearch(e.target.value)}
                allowClear
                style={{ width: 300 }}
            />
        </Space>
    );
};

export default SearchBar;