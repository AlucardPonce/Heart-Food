import { Form, Input, Button, Card, Typography, message } from "antd";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./components/styles/Login.css";

const { Title } = Typography;
const base_url = "http://localhost:3001";

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");

        try {
            const response = await axios.post(`${base_url}/validate`, values, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.data.statusCode === 200) {
                message.success("Inicio de sesión exitoso");
                localStorage.setItem("token", response.data.data.token);
                navigate("/home");
            } else {
                setFormError("Credenciales incorrectas");
            }
        } catch (error) {
            setFormError("Error en la autenticación");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.body.style.margin = "0";
        document.documentElement.style.height = "100%";
        document.body.style.height = "100%";
    }, []);

    return (
        <div className="container-login">
            <Card className="card-login" bordered={false}>
                <Title level={2} className="center-login">Iniciar Sesión</Title>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: "Por favor, ingrese su usuario" }]}
                        validateStatus={formError ? "error" : ""}
                        help={formError && formError}
                    >
                        <Input placeholder="Usuario" />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: "Ingrese su contraseña" },
                            { min: 6, message: "Debe tener al menos 6 caracteres" },
                        ]}
                        validateStatus={formError ? "error" : ""}
                        help={formError && formError}
                    >
                        <Input.Password placeholder="Contraseña" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            className="button-login"
                        >
                            Iniciar Sesión
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;
