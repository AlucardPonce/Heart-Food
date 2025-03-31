import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Row, Col, DatePicker, Select, Button, Spin, Divider, Table, notification } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import apiClient from '../../services/interceptor';
import moment from 'moment';
import { DownloadOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const { RangePicker } = DatePicker;
const { Option } = Select;

const useWebSocketData = () => {
    const [realTimeData, setRealTimeData] = useState(null);

    useEffect(() => {
        const ws = new WebSocket('wss://ws.postman-echo.com/raw');

        ws.onopen = () => {
            console.log('Conexión WebSocket establecida');
            ws.send('Solicito datos de ventas'); // Envía mensaje inicial
        };

        ws.onmessage = (e) => {
            // Simulando datos (en producción vendrían de tu backend)
            const mockData = {
                ventas: Math.floor(Math.random() * 1000),
                timestamp: new Date().toLocaleTimeString()
            };
            setRealTimeData(mockData);
        };

        return () => ws.close();
    }, []);

    return realTimeData;
};

const Graficas = () => {

    const Graficas = () => {
        const realTimeData = useWebSocketData();

        // Agrega esto donde quieras mostrar los datos:
        {
            realTimeData && (
                <Card title="Datos en Tiempo Real" style={{ marginBottom: 20 }}>
                    <p>Última venta: ${realTimeData.ventas}</p>
                    <p>Actualizado: {realTimeData.timestamp}</p>
                </Card>
            )
        }
    };

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

    const reportRef = useRef(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    const cargarOpcionesFiltros = useCallback(async () => {
        try {
            const response = await apiClient.get('/ventas');
            const ventasData = response.data.data || [];

            const vendedoresUnicos = Array.from(
                new Set(ventasData.map(v => v.vendedor).filter(Boolean))
            ).map(v => ({ nombre: v }));

            const metodosPagoUnicos = Array.from(
                new Set(ventasData.map(v => v.metodoPago).filter(Boolean))
            ).map(m => ({ metodo: m }));

            setVendedores(vendedoresUnicos);
            setMetodosPago(metodosPagoUnicos);
        } catch (error) {
            console.error('Error cargando opciones de filtros:', error);
            notification.error({
                message: 'Error',
                description: 'No se pudieron cargar las opciones de filtros'
            });
        }
    }, []);

    const cargarVentas = useCallback(async () => {
        setLoading(true);
        try {
            let fechaInicio, fechaFin;

            switch (filtros.periodo) {
                case 'hoy':
                    fechaInicio = moment().startOf('day');
                    fechaFin = moment().endOf('day');
                    break;
                case 'semana':
                    fechaInicio = moment().startOf('week');
                    fechaFin = moment().endOf('week');
                    break;
                case 'mes':
                    fechaInicio = moment().startOf('month');
                    fechaFin = moment().endOf('month');
                    break;
                case 'anio':
                    fechaInicio = moment().startOf('year');
                    fechaFin = moment().endOf('year');
                    break;
                case 'personalizado':
                    if (filtros.rangoFechas?.length === 2) {
                        fechaInicio = filtros.rangoFechas[0].startOf('day');
                        fechaFin = filtros.rangoFechas[1].endOf('day');
                    }
                    break;
                default:
                    fechaInicio = moment().startOf('day');
                    fechaFin = moment().endOf('day');
            }

            const response = await apiClient.get('/ventas', { params: { fechaInicio, fechaFin } });
            let ventasFiltradas = response.data.data || [];

            if (filtros.vendedor) {
                ventasFiltradas = ventasFiltradas.filter(venta => venta.vendedor === filtros.vendedor);
            }
            if (filtros.metodoPago) {
                ventasFiltradas = ventasFiltradas.filter(venta => venta.metodoPago === filtros.metodoPago);
            }

            setVentas(ventasFiltradas);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            notification.error({
                message: 'Error',
                description: 'No se pudieron cargar las ventas'
            });
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        cargarOpcionesFiltros();
    }, [cargarOpcionesFiltros]);

    useEffect(() => {
        cargarVentas();
    }, [cargarVentas]);

    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({
            ...prev,
            [key]: value,
            ...(key === 'periodo' && value !== 'personalizado' && { rangoFechas: null })
        }));
    };

    const generarReportePDF = async () => {
        setGeneratingPDF(true);
        try {
            const pdf = new jsPDF('p', 'pt', 'a4');

            // Título
            pdf.setFontSize(20);
            pdf.setTextColor(40, 40, 40);
            pdf.text('Reporte de Ventas', pdf.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

            // Filtros aplicados
            pdf.setFontSize(12);
            let filtrosText = `Período: ${filtros.periodo.charAt(0).toUpperCase() + filtros.periodo.slice(1)}`;
            if (filtros.periodo === 'personalizado' && filtros.rangoFechas) {
                filtrosText += ` (${filtros.rangoFechas[0].format('DD/MM/YYYY')} - ${filtros.rangoFechas[1].format('DD/MM/YYYY')})`;
            }
            if (filtros.vendedor) filtrosText += ` | Vendedor: ${filtros.vendedor}`;
            if (filtros.metodoPago) filtrosText += ` | Método: ${filtros.metodoPago}`;

            pdf.text(filtrosText, 40, 50);
            pdf.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, 40, 70);

            let yPosition = 90;

            // Gráfica 1
            const chart1 = document.querySelector('#chart-ventas-container');
            if (chart1) {
                const canvas1 = await html2canvas(chart1, { scale: 2 });
                const imgData1 = canvas1.toDataURL('image/png');
                const imgWidth = pdf.internal.pageSize.getWidth() - 80;
                const imgHeight = (canvas1.height * imgWidth) / canvas1.width;
                pdf.addImage(imgData1, 'PNG', 40, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 20;
            }

            // Gráfica 2
            const chart2 = document.querySelector('#chart-metodos-container');
            if (chart2) {
                const canvas2 = await html2canvas(chart2, { scale: 2 });
                const imgData2 = canvas2.toDataURL('image/png');
                const imgWidth = pdf.internal.pageSize.getWidth() - 80;
                const imgHeight = (canvas2.height * imgWidth) / canvas2.width;
                pdf.addImage(imgData2, 'PNG', 40, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 20;
            }

            autoTable(pdf, {
                head: [['Fecha', 'Vendedor', 'Método Pago', 'Total']],
                body: ventas.map(venta => [
                    moment(venta.fechaVenta).format('DD/MM/YYYY HH:mm'),
                    venta.vendedor || 'N/A',
                    venta.metodoPago || 'N/A',
                    `$${venta.total.toFixed(2)}`
                ]),
                startY: yPosition,
                margin: { left: 40 },
                styles: {
                    fontSize: 9,
                    cellPadding: 5
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                }
            });

            pdf.save(`reporte_ventas_${moment().format('YYYYMMDD_HHmmss')}.pdf`);

            notification.success({
                message: 'Éxito',
                description: 'Reporte generado correctamente'
            });
        } catch (error) {
            console.error('Error generando PDF:', error);
            notification.error({
                message: 'Error',
                description: 'No se pudo generar el reporte PDF'
            });
        } finally {
            setGeneratingPDF(false);
        }
    };


    const prepararDatosGrafica = useCallback(() => {
        return ventas.reduce((acc, venta) => {
            const fecha = moment(venta.fechaVenta).format('YYYY-MM-DD');
            acc[fecha] = (acc[fecha] || 0) + venta.total;
            return acc;
        }, {});
    }, [ventas]);

    const prepararDatosMetodosPago = useCallback(() => {
        return ventas.reduce((acc, venta) => {
            const metodo = venta.metodoPago || 'Desconocido';
            acc[metodo] = (acc[metodo] || 0) + venta.total;
            return acc;
        }, {});
    }, [ventas]);

    const opcionesGraficaVentas = {
        title: { text: 'Ventas por Día' },
        xAxis: { type: 'category' },
        yAxis: { title: { text: 'Monto Total ($)' } },
        series: [{
            name: 'Ventas',
            type: 'column',
            colorByPoint: true,
            data: Object.entries(prepararDatosGrafica()).map(([fecha, total]) => ({
                name: fecha,
                y: total
            })),
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

    const opcionesGraficaMetodosPago = {
        title: { text: 'Ventas por Método de Pago' },
        series: [{
            name: 'Método de Pago',
            type: 'pie',
            data: Object.entries(prepararDatosMetodosPago()).map(([metodo, total]) => ({
                name: metodo,
                y: total
            }))
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

    const columnas = [
        {
            title: 'Fecha',
            dataIndex: 'fechaVenta',
            key: 'fechaVenta',
            render: text => moment(text).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => moment(a.fechaVenta).unix() - moment(b.fechaVenta).unix()
        },
        {
            title: 'Vendedor',
            dataIndex: 'vendedor',
            key: 'vendedor',
            render: text => text || 'N/A',
            filters: vendedores.map(v => ({ text: v.nombre, value: v.nombre })),
            onFilter: (value, record) => record.vendedor === value
        },
        {
            title: 'Método Pago',
            dataIndex: 'metodoPago',
            key: 'metodoPago',
            render: text => text || 'N/A',
            filters: metodosPago.map(m => ({ text: m.metodo, value: m.metodo })),
            onFilter: (value, record) => record.metodoPago === value
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: text => `$${Number(text).toFixed(2)}`,
            sorter: (a, b) => a.total - b.total
        }
    ];

    return (
        <div style={{ padding: '20px' }} ref={reportRef}>
            <Card title="Filtros de Reporte" style={{ marginBottom: '20px' }}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Seleccione período"
                            value={filtros.periodo}
                            onChange={value => handleFiltroChange('periodo', value)}
                        >
                            <Option value="hoy">Hoy</Option>
                            <Option value="semana">Esta semana</Option>
                            <Option value="mes">Este mes</Option>
                            <Option value="anio">Este año</Option>
                            <Option value="personalizado">Personalizado</Option>
                        </Select>
                    </Col>

                    {filtros.periodo === 'personalizado' && (
                        <Col xs={24} sm={12} md={8} lg={6}>
                            <RangePicker
                                style={{ width: '100%' }}
                                value={filtros.rangoFechas}
                                onChange={dates => handleFiltroChange('rangoFechas', dates)}
                            />
                        </Col>
                    )}

                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Filtrar por vendedor"
                            allowClear
                            value={filtros.vendedor}
                            onChange={value => handleFiltroChange('vendedor', value)}
                            options={vendedores.map(v => ({
                                value: v.nombre,
                                label: v.nombre
                            }))}
                        />
                    </Col>

                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Filtrar por método de pago"
                            allowClear
                            value={filtros.metodoPago}
                            onChange={value => handleFiltroChange('metodoPago', value)}
                            options={metodosPago.map(m => ({
                                value: m.metodo,
                                label: m.metodo
                            }))}
                        />
                    </Col>
                </Row>

                <Divider />

                <Row justify="end">
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={generarReportePDF}
                        disabled={ventas.length === 0 || generatingPDF}
                        loading={generatingPDF}
                    >
                        {generatingPDF ? 'Generando PDF...' : 'Descargar Reporte PDF'}
                    </Button>
                </Row>
            </Card>

            {loading ? (
                <Spin size="large" style={{ display: 'block', margin: '20px auto' }} />
            ) : (
                <>
                    {ventas.length > 0 ? (
                        <>
                            <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                                <Col xs={24} lg={12}>
                                    <Card>
                                        <div id="chart-ventas-container">
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={opcionesGraficaVentas}
                                            />
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} lg={12}>
                                    <Card>
                                        <div id="chart-metodos-container">
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={opcionesGraficaMetodosPago}
                                            />
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            <Card title="Detalle de Ventas">
                                <Table
                                    columns={columnas}
                                    dataSource={ventas}
                                    rowKey="id"
                                    pagination={{
                                        pageSize: 5,
                                        showSizeChanger: true,
                                        pageSizeOptions: ['5', '10', '20', '50']
                                    }}
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