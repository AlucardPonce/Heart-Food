import { Form, Input, Button, Card, Typography, message, Modal, Divider, Alert } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
    const [mfaData, setMfaData] = useState({ qrCode: "", secret: "" });
    const [username, setUsername] = useState("");
    const [mfaAttempts, setMfaAttempts] = useState(0);
    const navigate = useNavigate();

    const API_URL = "http://localhost:3001";

    const resetMfaFlow = () => {
        setMfaRequired(false);
        setMfaSetupRequired(false);
        setMfaData({ qrCode: "", secret: "" });
        setFormError("");
        setMfaAttempts(0);
    };

    const onFinish = async (values) => {
        setLoading(true);
        setFormError("");
        setUsername(values.username);

        try {
            const response = await axios.post(`${API_URL}/mfa/validate-user`, values);

            if (response.data.requireMFA) {
                setMfaRequired(true);

                if (response.data.mfaSetupRequired) {
                    setMfaSetupRequired(true);
                    await generateMfaSecret(values.username);
                    message.info("Configura MFA escaneando el QR");
                } else {
                    message.success("Ingresa tu código MFA");
                }
            } else {
                handleLoginSuccess(response.data.token);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Error en la autenticación";
            setFormError(errorMsg);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const generateMfaSecret = async (username) => {
        try {
            const response = await axios.post(`${API_URL}/mfa/generate`, { username });
            setMfaData({
                qrCode: response.data.qrCode,
                secret: response.data.secret
            });
        } catch (error) {
            message.error("No se pudo generar el código MFA");
            console.error("Error generating MFA:", error);
            resetMfaFlow();
        }
    };

    const handleMfaVerification = async (mfaCode) => {
        try {
            const response = await axios.post(`${API_URL}/mfa/validate`, {
                username,
                token: mfaCode
            }, {
                validateStatus: (status) => status < 500 // Para manejar 400, 401, etc.
            });
    
            console.log('Respuesta del servidor:', response.data); // Debug
    
            if (!response.data.success) {
                throw new Error(response.data.message || "Error en autenticación");
            }
    
            if (!response.data.token) {
                throw new Error("No se recibió token en la respuesta");
            }
    
            // Verificar estructura básica del token
            const tokenParts = response.data.token.split('.');
            if (tokenParts.length !== 3) {
                console.error('Token mal formado:', response.data.token);
                throw new Error('Token mal formado');
            }
    
            // Guardar token
            localStorage.setItem("token", response.data.token);
            
            // Verificar que se guardó correctamente
            const storedToken = localStorage.getItem("token");
            if (storedToken !== response.data.token) {
                throw new Error('Error al guardar el token');
            }
    
            // Redirigir a home
            navigate("/home");
    
        } catch (error) {
            console.error('Error en verificación MFA:', {
                error: error.message,
                response: error.response?.data
            });
            
            setFormError(error.response?.data?.message || error.message);
            message.error(error.response?.data?.message || error.message);
        }
    };

    const handleLoginSuccess = (token) => {
        if (typeof token === 'string' && token.split('.').length === 3) {
            localStorage.setItem("token", token);
            navigate('/home');
        } else {
            console.error('Token recibido no válido:', token);
            message.error('Error en autenticación');
        }
    };

    const handleResetPassword = () => {
        let email = "";

        Modal.confirm({
            title: "Restablecer contraseña",
            content: (
                <Input
                    placeholder="Ingresa tu correo electrónico"
                    onChange={(e) => (email = e.target.value)}
                    type="email"
                />
            ),
            onOk: async () => {
                try {
                    await axios.post(`${API_URL}/reset-password`, { email });
                    message.success("Correo de recuperación enviado");
                } catch (error) {
                    message.error(error.response?.data?.message || "Error al enviar correo");
                }
            },
        });
    };

    return (
        <div style={styles.container}>
            <Card style={styles.card}>
                <Title level={2} style={styles.title}>
                    Iniciar Sesión
                </Title>

                {formError && (
                    <Alert
                        message={formError}
                        type="error"
                        showIcon
                        style={{ marginBottom: 20 }}
                    />
                )}

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: "Ingrese su usuario" }]}
                    >
                        <Input placeholder="Usuario" />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[
                            { required: true, message: "Ingrese su contraseña" },
                            { min: 6, message: "Mínimo 6 caracteres" }
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
                            style={styles.button}
                        >
                            Iniciar Sesión
                        </Button>
                    </Form.Item>

                    <div style={styles.footer}>
                        <Button
                            type="link"
                            onClick={handleResetPassword}
                            style={styles.linkButton}
                        >
                            ¿Olvidaste tu contraseña?
                        </Button>
                    </div>
                </Form>

                <Modal
                    title={mfaSetupRequired ? "Configurar Autenticación en Dos Pasos" : "Verificación en Dos Pasos"}
                    open={mfaRequired}
                    onCancel={resetMfaFlow}
                    footer={null}
                    width={400}
                    destroyOnClose
                >
                    {mfaSetupRequired && (
                        <div style={styles.mfaSetupContainer}>
                            <Text strong>Escanea este código con Google Authenticator:</Text>
                            <div style={styles.qrContainer}>
                                {mfaData.qrCode ? (
                                    <img
                                        src={mfaData.qrCode}
                                        alt="QR Code"
                                        style={styles.qrCode}
                                    />
                                ) : (
                                    <Text type="secondary">Generando código QR...</Text>
                                )}
                            </div>
                            <Divider>o</Divider>
                            <Text strong>Ingresa manualmente este código:</Text>
                            <Text code style={styles.secretCode}>
                                {mfaData.secret || "Cargando..."}
                            </Text>
                            <Alert
                                message="Después de configurar, ingresa el código de 6 dígitos que muestra la app"
                                type="info"
                                style={{ marginTop: 16 }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                        <Text strong>Ingresa el código de 6 dígitos:</Text>
                        <Input
                            placeholder="123456"
                            maxLength={6}
                            style={{ marginTop: 8 }}
                            onChange={(e) => {
                                if (e.target.value.length === 6) {
                                    handleMfaVerification(e.target.value);
                                }
                            }}
                            autoFocus
                        />
                    </div>

                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Button
                            type="link"
                            onClick={() => generateMfaSecret(username)}
                        >
                            Regenerar código QR
                        </Button>
                    </div>
                </Modal>
            </Card>
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    },
    title: {
        textAlign: 'center',
        marginBottom: 24,
        color: '#333'
    },
    button: {
        height: 40,
        fontWeight: 500
    },
    footer: {
        marginTop: 16,
        textAlign: 'center'
    },
    linkButton: {
        padding: 0
    },
    mfaSetupContainer: {
        textAlign: 'center',
        marginBottom: 24
    },
    qrContainer: {
        margin: '16px 0',
        padding: 8,
        border: '1px dashed #d9d9d9',
        borderRadius: 4,
        display: 'inline-block'
    },
    qrCode: {
        width: 180,
        height: 180
    },
    secretCode: {
        display: 'block',
        margin: '8px 0',
        fontSize: 16,
        padding: 8,
        background: '#f5f5f5',
        borderRadius: 4
    }
};

export default LoginPage;