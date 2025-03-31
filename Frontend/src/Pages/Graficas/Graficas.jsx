import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, DatePicker, Select, Button, Spin, Divider, Table, notification } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import apiClient from '../../services/interceptor';
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

    // Función para cargar opciones de filtros
    const cargarOpcionesFiltros = useCallback(async () => {
        try {
            const response = await apiClient.get('/ventas');
            const ventasData = response.data.data || [];
            
            // Extraer y normalizar vendedores únicos
            const vendedoresUnicos = Array.from(
                new Set(ventasData.map(v => v.vendedor).filter(Boolean))
            ).map(v => ({ nombre: v }));
            
            // Extraer y normalizar métodos de pago únicos
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

    // Función para cargar ventas con filtros aplicados
    const cargarVentas = useCallback(async () => {
        setLoading(true);
        try {
            let fechaInicio, fechaFin;

            // Determinar rango de fechas según el periodo seleccionado
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

            // Filtrar por vendedor y método de pago en el cliente
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

    // Efectos para carga inicial y cuando cambian los filtros
    useEffect(() => {
        cargarOpcionesFiltros();
    }, [cargarOpcionesFiltros]);

    useEffect(() => {
        cargarVentas();
    }, [cargarVentas]);

    // Manejador de cambios en filtros
    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({
            ...prev,
            [key]: value,
            // Resetear rango de fechas si no es personalizado
            ...(key === 'periodo' && value !== 'personalizado' && { rangoFechas: null })
        }));
    };

    // Generar reporte mejorado
    const generarReporte = () => {
        try {
            const datosReporte = ventas.map(venta => ({
                Fecha: moment(venta.fechaVenta).format('DD/MM/YYYY HH:mm'),
                Vendedor: venta.vendedor || 'N/A',
                'Método Pago': venta.metodoPago || 'N/A',
                Total: `$${venta.total.toFixed(2)}`,
                Productos: venta.productos?.map(p => p.nombre).join(', ') || 'N/A'
            }));

            console.table(datosReporte);
            notification.success({
                message: 'Reporte generado',
                description: 'Los datos del reporte están disponibles en la consola'
            });
        } catch (error) {
            console.error('Error generando reporte:', error);
            notification.error({
                message: 'Error',
                description: 'No se pudo generar el reporte'
            });
        }
    };

    // Preparar datos para gráficas
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

    // Configuraciones de Highcharts
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

    // Columnas para la tabla
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
        <div style={{ padding: '20px' }}>
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
                        onClick={generarReporte}
                        disabled={ventas.length === 0}
                    >
                        Generar Reporte
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
                                        <HighchartsReact
                                            highcharts={Highcharts}
                                            options={opcionesGraficaVentas}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} lg={12}>
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