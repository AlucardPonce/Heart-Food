import { Form, Input, Button, Card, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // Importamos nuestro hook de autenticación
import api from "../../services/api"; // Importamos nuestro servicio API configurado
import "./components/styles/Login.css";

const { Title } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const navigate = useNavigate();
    const { login } = useAuth(); // Usamos el método login del hook

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");

        try {
            const response = await api.post("/validate", values);
            
            if (response.data.statusCode === 200) {
                message.success("Inicio de sesión exitoso");
                login(response.data.data.token); // Usamos el método login del hook
                navigate("/home");
            } else {
                setFormError(response.data.intMessage || "Credenciales incorrectas");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.intMessage || "Error en la autenticación";
            setFormError(errorMessage);
            message.error(errorMessage);
            console.error("Error en login:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-login">
            <Card className="card-login" bordered={false}>
                <Title level={2} className="center-login">Iniciar Sesión</Title>

                <Form
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ remember: true }}
                >
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: "Por favor, ingrese su usuario" }]}
                        validateStatus={formError ? "error" : ""}
                        help={formError && formError}
                    >
                        <Input placeholder="Usuario" autoFocus />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: "Ingrese su contraseña" },
                            { min: 6, message: "Debe tener al menos 6 caracteres" },
                        ]}
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
                            disabled={loading}
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