import { Form, Input, Button, Card, Typography, message, Modal } from "antd";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const navigate = useNavigate();

    const API_URL = "http://localhost:3001";

    useEffect(() => {
        localStorage.removeItem("token");
    }, []);

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");

        try {
            const response = await axios.post(`${API_URL}/validate`,
                values,
                {
                    headers: {
                        "Content-Type": "application/json",
                    }
                }
            );

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

    const handleResetPassword = () => {
        let email = "";

        Modal.confirm({
            title: "Restablecer contraseña",
            content: (
                <Input
                    placeholder="Ingresa tu correo"
                    onChange={(e) => (email = e.target.value)}
                />
            ),
            onOk: async () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!email || !emailRegex.test(email)) {
                    message.error("Por favor, ingresa un correo válido.");
                    return;
                }

                try {
                    await axios.post(`${API_URL}/reset-password`, { email });
                    message.success("Correo de recuperación enviado");
                } catch (error) {
                    const resetErrorMessage = error.response?.data?.message || "No se pudo enviar el correo";
                    console.error("Error al enviar el correo de recuperación:", resetErrorMessage);
                    message.error(resetErrorMessage);
                }
            },
        });
    };

    useEffect(() => {
        document.body.style.margin = "0";
        document.documentElement.style.height = "100%";
        document.body.style.height = "100%";
    }, []);

    return (
        <div style={styles.container}>
            <Card style={styles.card} variant={false}>
                <Title level={2} style={{ textAlign: "center", color: "#333" }}>
                    Iniciar Sesión
                </Title>

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
                            style={styles.button}
                        >
                            Iniciar Sesión
                        </Button>
                    </Form.Item>

                    <Button type="link" onClick={handleResetPassword} style={{ padding: 0 }}>
                        ¿Olvidaste tu contraseña?
                    </Button>
                </Form>
                <div style={styles.center}>
                    <p>
                        ¿Aún no tienes cuenta?
                        <Button
                            type="link"
                            onClick={() => navigate("/register")}
                            style={{ padding: 0, fontSize: "14px" }}
                        >
                            Registrar aquí
                        </Button>
                    </p>
                </div>
            </Card>
        </div>
    );
};

const styles = {
    container: {
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
    },
    card: {
        width: 380,
        padding: 20,
        borderRadius: 10,
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
        background: "#fff",
    },
    button: {
        backgroundColor: "#1890ff",
        borderColor: "#1890ff",
        fontSize: "16px",
    },
    errorMessage: {
        color: "#f5222d",
        marginBottom: "10px",
        fontSize: "14px",
        textAlign: "center",
    },
    center: {
        textAlign: "center",
        marginTop: "10px",
    },
};

export default LoginPage;