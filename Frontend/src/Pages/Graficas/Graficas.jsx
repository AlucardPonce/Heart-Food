import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Select, Button, Spin, Divider, Table } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import apiClient from '../../services/interceptor'; // Ajusta la ruta según tu estructura
import moment from 'moment';
import { DownloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Graficas = () => {
    const [loading, setLoading] = useState(false);
    const [ventas, setVentas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [filtros, setFiltros] = useState({
        rangoFechas: null,
        vendedor: null,
        metodoPago: null,
        periodo: 'hoy'
    });

    // Obtener datos iniciales
    useEffect(() => {
        cargarOpcionesFiltros();
        cargarVentas();
    }, []);

    // Cargar ventas cuando cambian los filtros
    useEffect(() => {
        cargarVentas();
    }, [filtros]);

    const cargarOpcionesFiltros = async () => {
        try {
            // Cargar vendedores y métodos de pago desde la API
            const [ventasRes] = await Promise.all([
                apiClient.get('/ventas')
            ]);

            // Extraer vendedores únicos
            const vendedoresUnicos = [...new Set(
                ventasRes.data.data.map(v => v.vendedor).filter(Boolean)
            )].map(v => ({ nombre: v }));

            // Extraer métodos de pago únicos
            const metodosPagoUnicos = [...new Set(
                ventasRes.data.data.map(v => v.metodoPago).filter(Boolean)
            )].map(m => ({ metodo: m }));

            setVendedores(vendedoresUnicos);
            setMetodosPago(metodosPagoUnicos);
        } catch (error) {
            console.error('Error cargando opciones de filtros:', error);
        }
    };

    const cargarVentas = async () => {
        setLoading(true);
        try {
            let fechaInicio, fechaFin;

            // Ajustar fechas según el periodo seleccionado
            switch (filtros.periodo) {
                case 'hoy':
                    fechaInicio = moment().startOf('day').toISOString();
                    fechaFin = moment().endOf('day').toISOString();
                    break;
                case 'semana':
                    fechaInicio = moment().startOf('week').toISOString();
                    fechaFin = moment().endOf('week').toISOString();
                    break;
                case 'mes':
                    fechaInicio = moment().startOf('month').toISOString();
                    fechaFin = moment().endOf('month').toISOString();
                    break;
                case 'anio':
                    fechaInicio = moment().startOf('year').toISOString();
                    fechaFin = moment().endOf('year').toISOString();
                    break;
                case 'personalizado':
                    if (filtros.rangoFechas && filtros.rangoFechas.length === 2) {
                        fechaInicio = filtros.rangoFechas[0].startOf('day').toISOString();
                        fechaFin = filtros.rangoFechas[1].endOf('day').toISOString();
                    }
                    break;
                default:
                    fechaInicio = moment().startOf('day').toISOString();
                    fechaFin = moment().endOf('day').toISOString();
            }

            const params = {
                fechaInicio,
                fechaFin,
                vendedor: filtros.vendedor,
                metodoPago: filtros.metodoPago
            };

            const response = await apiClient.get('/ventas', { params });
            setVentas(response.data.data || []);
        } catch (error) {
            console.error('Error cargando ventas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const generarReporte = () => {
        // Implementación básica - en producción usarías una librería como jsPDF o exceljs
        const datosReporte = ventas.map(venta => ({
            Fecha: moment(venta.fechaVenta).format('DD/MM/YYYY HH:mm'),
            Vendedor: venta.vendedor || 'N/A',
            'Método Pago': venta.metodoPago || 'N/A',
            Total: `$${venta.total.toFixed(2)}`
        }));

        console.log('Datos para reporte:', datosReporte);
        alert('Función de generar reporte activada. Ver consola para los datos.');
    };

    // Preparar datos para Highcharts
    const prepararDatosGrafica = () => {
        if (!ventas.length) return [];

        // Agrupar ventas por día
        const ventasPorDia = ventas.reduce((acc, venta) => {
            const fecha = moment(venta.fechaVenta).format('YYYY-MM-DD');
            if (!acc[fecha]) {
                acc[fecha] = 0;
            }
            acc[fecha] += venta.total;
            return acc;
        }, {});

        return Object.entries(ventasPorDia).map(([fecha, total]) => ({
            name: fecha,
            y: total
        }));
    };

    const prepararDatosMetodosPago = () => {
        if (!ventas.length) return [];

        const ventasPorMetodo = ventas.reduce((acc, venta) => {
            const metodo = venta.metodoPago || 'Desconocido';
            if (!acc[metodo]) {
                acc[metodo] = 0;
            }
            acc[metodo] += venta.total;
            return acc;
        }, {});

        return Object.entries(ventasPorMetodo).map(([metodo, total]) => ({
            name: metodo,
            y: total
        }));
    };

    // Configuración de Highcharts para gráfica de ventas por día
    const opcionesGraficaVentas = {
        title: {
            text: 'Ventas por Día'
        },
        xAxis: {
            type: 'category'
        },
        yAxis: {
            title: {
                text: 'Monto Total ($)'
            }
        },
        series: [{
            name: 'Ventas',
            type: 'column',
            colorByPoint: true,
            data: prepararDatosGrafica(),
        }],
        plotOptions: {
            column: {
                borderRadius: 5,
                dataLabels: {
                    enabled: true,
                    format: '${point.y:,.0f}'
                }
            }
        }
    };

    // Configuración de Highcharts para gráfica de métodos de pago
    const opcionesGraficaMetodosPago = {
        title: {
            text: 'Ventas por Método de Pago'
        },
        series: [{
            name: 'Método de Pago',
            type: 'pie',
            data: prepararDatosMetodosPago()
        }],
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: ${point.y:,.0f}'
                }
            }
        }
    };

    // Columnas para la tabla de resumen
    const columnas = [
        {
            title: 'Fecha',
            dataIndex: 'fechaVenta',
            key: 'fechaVenta',
            render: (text) => moment(text).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: (text) => text || 'N/A'
        },
        {
            title: 'Método Pago',
            dataIndex: 'metodoPago',
            key: 'metodoPago',
            render: (text) => text || 'N/A'
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (text) => `$${text.toFixed(2)}`
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            <Card title="Filtros de Reporte" style={{ marginBottom: '20px' }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Seleccione período"
                            value={filtros.periodo}
                            onChange={(value) => handleFiltroChange('periodo', value)}
                        >
                            <Option value="hoy">Hoy</Option>
                            <Option value="semana">Esta semana</Option>
                            <Option value="mes">Este mes</Option>
                            <Option value="anio">Este año</Option>
                            <Option value="personalizado">Personalizado</Option>
                        </Select>
                    </Col>

                    {filtros.periodo === 'personalizado' && (
                        <Col span={6}>
                            <RangePicker
                                style={{ width: '100%' }}
                                onChange={(dates) => handleFiltroChange('rangoFechas', dates)}
                            />
                        </Col>
                    )}

                    <Col span={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Filtrar por vendedor"
                            allowClear
                            value={filtros.vendedor}
                            onChange={(value) => handleFiltroChange('vendedor', value)}
                        >
                            {vendedores.map((v, i) => (
                                <Option key={v.nombre} value={v.nombre}>{v.nombre}</Option>
                            ))}
                        </Select>
                    </Col>

                    <Col span={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Filtrar por método de pago"
                            allowClear
                            value={filtros.metodoPago}
                            onChange={(value) => handleFiltroChange('metodoPago', value)}
                        >
                            {metodosPago.map((m, i) => (
                                <Option key={m.metodo} value={m.metodo}>{m.metodo}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>

                <Divider />

                <Row justify="end">
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={generarReporte}
                        disabled={ventas.length === 0}
                    >
                        Generar Reporte
                    </Button>
                </Row>
            </Card>

            {loading ? (
                <Spin size="large" />
            ) : (
                <>
                    {ventas.length > 0 ? (
                        <>
                            <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                                <Col span={12}>
                                    <Card>
                                        <HighchartsReact
                                            highcharts={Highcharts}
                                            options={opcionesGraficaVentas}
                                        />
                                    </Card>
                                </Col>
                                <Col span={12}>
                                    <Card>
                                        <HighchartsReact
                                            highcharts={Highcharts}
                                            options={opcionesGraficaMetodosPago}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Card title="Detalle de Ventas">
                                <Table
                                    columns={columnas}
                                    dataSource={ventas}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                    scroll={{ x: true }}
                                />
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <p>No hay datos de ventas para los filtros seleccionados</p>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default Graficas;