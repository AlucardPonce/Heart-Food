import React, { useState } from "react";
import {
    UserOutlined,
    NotificationOutlined,
    ContactsOutlined,
    SettingOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
} from "@ant-design/icons";
import { Button, Menu, Modal, Avatar } from "antd";
import { useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState("");
    const navigate = useNavigate();

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    const handleMenuClick = (e) => {
        const modals = {
            1: "Perfil",
            3: "Contacto",
            4: "Configuraciones",
            5: "Cerrar Sesión",
        };

        const content = modals[e.key];
        if (content) {
            setModalContent(content);
            setIsModalVisible(true);
        }
    };

    const handleOk = () => {
        if (modalContent === "Cerrar Sesión") {
            navigate("/");
        } else {
            setIsModalVisible(false);
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    return (
        <>
            <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
                <Button type="primary" onClick={toggleCollapsed} className="menu-toggle">
                    {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </Button>
                <Menu
                    mode="inline"
                    theme="dark"
                    inlineCollapsed={collapsed}
                    onClick={handleMenuClick}
                    items={[
                        {
                            key: "1",
                            icon: <UserOutlined />,
                            label: "Perfil",
                        },
                        {
                            key: "3",
                            icon: <ContactsOutlined />,
                            label: "Contacto",
                        },
                        {
                            key: "4",
                            icon: <SettingOutlined />,
                            label: "Configuraciones",
                        },
                        {
                            key: "5",
                            icon: <LogoutOutlined />,
                            label: "Cerrar Sesión",
                        },
                    ]}
                />
            </div>

            <Modal
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                centered
                footer={[
                    <Button key="ok" type="primary" onClick={handleOk}>
                        {modalContent === "Cerrar Sesión" ? "Sí, cerrar sesión" : "Cerrar"}
                    </Button>,
                    <Button key="cancel" type="" onClick={handleCancel}>{modalContent === "Cerrar Sesión" ? "Cancelar" : "Cerrar"}</Button>
                ]}
                className="custom-modal"
                closeIcon={null}
            >
                {modalContent === "Perfil" ? (
                    <div className="profile-modal-content">
                        <Avatar
                            size={100}
                            src="https://i.pravatar.cc/150?img=3"
                            style={{ marginBottom: "15px" }}
                        />
                        <h3>Jorge Alberto</h3>
                        <p>Email: jorge@example.com</p>
                        <p>Rol: Administrador</p>
                    </div>
                ) : modalContent === "Cerrar Sesión" ? (
                    <p className="modal-text">¿Estás seguro de que deseas cerrar sesión?</p>
                ) : (
                    <p className="modal-text">Aquí va el contenido de <strong>{modalContent}</strong>.</p>
                )}
            </Modal>
        </>
    );
};

export default Sidebar;

