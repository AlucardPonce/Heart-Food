import { Form, Input, Button, Card, Typography, message, Modal, Steps, Alert } from "antd";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from 'qrcode.react';

const { Title } = Typography;
const { Step } = Steps;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [step, setStep] = useState("login");
    const [secretUrl, setSecretUrl] = useState("");
    const [otp, setOtp] = useState("");
    const [username, setUsername] = useState("");
    const registerFormRef = useRef(null);
    const navigate = useNavigate();

    const API_URL = "http://localhost:3001";

    useEffect(() => {
        localStorage.removeItem("token");
    }, []);

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");
        setUsername(values.username);

        try {
            const response = await axios.post(`${API_URL}/validate`, values);

            if (response.data.statusCode === 200) {
                if (response.data.requiresMFA) {
                    setStep("otp");
                } else {
                    message.success("Inicio de sesión exitoso");
                    localStorage.setItem("token", response.data.data.token);
                    navigate("/home");
                }
            } else {
                setFormError(response.data.intMessage || "Credenciales incorrectas");
            }
        } catch (error) {
            setFormError(error.response?.data?.intMessage || "Error en la autenticación");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/validate`, {
                username,
                password: registerFormRef.current?.getFieldValue('password'),
                otpToken: otp
            });

            if (response.data.statusCode === 200) {
                message.success("Autenticación exitosa");
                localStorage.setItem("token", response.data.data.token);
                navigate("/home");
            } else {
                message.error(response.data.intMessage || "Error en la autenticación");
            }
        } catch (error) {
            message.error(error.response?.data?.message || "Error al verificar OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = () => {
        Modal.confirm({
            title: "Registrar nuevo usuario",
            width: 700,
            content: (
                <Form layout="vertical" ref={registerFormRef}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item
                            label="Nombre"
                            name="nombre"
                            rules={[{ required: true, message: 'Campo obligatorio' }]}
                            style={{ flex: 1 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="Apellido Paterno"
                            name="apellidoPaterno"
                            rules={[{ required: true, message: 'Campo obligatorio' }]}
                            style={{ flex: 1 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            label="Apellido Materno"
                            name="apellidoMaterno"
                            style={{ flex: 1 }}
                        >
                            <Input />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Correo Electrónico"
                        name="gmail"
                        rules={[
                            { required: true, message: 'Campo obligatorio' },
                            { type: 'email', message: 'Correo no válido' }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Nombre de Usuario"
                        name="username"
                        rules={[{ required: true, message: 'Campo obligatorio' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: 'Campo obligatorio' },
                            { min: 6, message: 'Mínimo 6 caracteres' }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            ),
            okText: 'Registrar',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    const values = await registerFormRef.current?.validateFields();
                    const userData = {
                        ...values,
                        rol: "worker" // Rol por defecto
                    };

                    const response = await axios.post(`${API_URL}/register`, userData);

                    if (response.data.data?.secretUrl) {
                        setSecretUrl(response.data.data.secretUrl);
                        setStep("qr");
                    } else {
                        message.success("Registro exitoso");
                    }

                    return true;
                } catch (error) {
                    message.error(error.response?.data?.intMessage || "Error al registrar");
                    return false;
                }
            }
        });
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
                    const response = await axios.post(`${API_URL}/reset-password`, { email });

                    if (response.data.requiresOTP) {
                        Modal.info({
                            title: "Verificación requerida",
                            content: (
                                <div>
                                    <p>Hemos enviado un código OTP a tu correo.</p>
                                    <Input
                                        placeholder="Ingresa el código OTP"
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>
                            ),
                            onOk: async () => {
                                const otpResponse = await axios.post(`${API_URL}/verify-reset-otp`, {
                                    email,
                                    otpToken: otp
                                });
                                message.success(otpResponse.data.message);
                            }
                        });
                    } else {
                        message.success(response.data.message);
                    }
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

    const renderStepContent = () => {
        switch (step) {
            case "qr":
                return (
                    <div style={{ textAlign: "center" }}>
                        <Title level={4} style={{ marginBottom: 20 }}>
                            Configura la autenticación de dos factores
                        </Title>
                        <QRCodeSVG
                            value={secretUrl}
                            size={200}
                            style={{ margin: "0 auto 20px", display: "block" }}
                        />
                        <p>Escanea este código QR con tu aplicación de autenticación</p>
                        <Button
                            type="primary"
                            onClick={() => setStep("login")}
                            style={{ marginTop: 20 }}
                        >
                            Continuar al login
                        </Button>
                    </div>
                );
            case "otp":
                return (
                    <div>
                        <Title level={4} style={{ textAlign: "center", marginBottom: 20 }}>
                            Verificación en dos pasos
                        </Title>
                        <Alert
                            message="Ingresa el código de verificación de tu aplicación de autenticación"
                            type="info"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />
                        <Form.Item
                            label="Código OTP"
                            rules={[{ required: true, message: "Por favor ingresa el código" }]}
                        >
                            <Input
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </Form.Item>
                        <Button
                            type="primary"
                            onClick={verifyOTP}
                            block
                            loading={loading}
                            style={styles.button}
                        >
                            Verificar
                        </Button>
                        <Button
                            type="link"
                            onClick={() => setStep("login")}
                            style={{ marginTop: 10, width: "100%" }}
                        >
                            Regresar al login
                        </Button>
                    </div>
                );
            default:
                return (
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
                );
        }
    };

    return (
        <div style={styles.container}>
            <Card style={styles.card} variant={false}>
                <Title level={2} style={{ textAlign: "center", color: "#333", marginBottom: 30 }}>
                    {step === "qr" ? "Configurar 2FA" :
                        step === "otp" ? "Verificación" : "Iniciar Sesión"}
                </Title>

                <Steps current={step === "qr" ? 1 : step === "otp" ? 2 : 0} size="small" style={{ marginBottom: 20 }}>
                    <Step title="Login" />
                    <Step title="Configurar 2FA" />
                    <Step title="Verificar" />
                </Steps>

                {renderStepContent()}

                {step === "login" && (
                    <div style={styles.center}>
                        <p>
                            ¿Aún no tienes cuenta?
                            <Button
                                type="link"
                                onClick={handleRegister}
                                style={{ padding: 0, fontSize: "14px" }}
                            >
                                Registrar aquí
                            </Button>
                        </p>
                    </div>
                )}
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