import { Form, Input, Button, Card, Typography, message } from "antd";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { authService } from "../../services/api";
import "./components/styles/Login.css";

const { Title } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
    }, []);

    useEffect(() => {
        if (authService.isAuthenticated()) {
            navigate("/home");
        }
    }, [navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");

        try {
            const response = await api.post("/validate", values, {
                skipAuth: true // Opcional: si has implementado esta opción
            });

            if (response.data.statusCode === 200) {
                message.success("Inicio de sesión exitoso");
                authService.login(
                    response.data.data.token,
                    response.data.data.user
                );
                navigate("/home");
            }
        } catch (error) {
            const errorMsg = error.response?.data?.intMessage ||
                "Error de conexión. Intente nuevamente.";
            setFormError(errorMsg);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-login">
            <Card className="card-login" variant={false}>
                <Title level={2} className="center-login">Iniciar Sesión</Title>

                <Form
                    layout="vertical"
                    onFinish={onFinish}
                >
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: "Ingrese su usuario" }]}
                        validateStatus={formError ? "error" : ""}
                    >
                        <Input placeholder="Usuario" autoFocus />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: "Ingrese su contraseña" },
                            { min: 6, message: "Mínimo 6 caracteres" },
                        ]}
                    >
                        <Input.Password placeholder="Contraseña" />
                    </Form.Item>

                    {formError && (
                        <div className="error-message" style={{ color: 'red', marginBottom: 16 }}>
                            {formError}
                        </div>
                    )}

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