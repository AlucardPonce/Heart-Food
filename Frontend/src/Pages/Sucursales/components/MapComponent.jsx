import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de marcadores
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = ({ sucursales, onMapClick, selectedSucursal }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const [mapReady, setMapReady] = useState(false);

    // Inicializar el mapa
    useEffect(() => {
        if (!mapRef.current) return;

        // Crear instancia del mapa
        const map = L.map(mapRef.current).setView([19.4326, -99.1332], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Manejar clics en el mapa
        map.on('click', (e) => {
            onMapClick(e.latlng);
        });

        // Guardar instancia del mapa
        mapInstance.current = map;
        setMapReady(true);

        // Limpiar al desmontar
        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    // Actualizar marcadores cuando cambian las sucursales o el mapa está listo
    useEffect(() => {
        if (!mapReady || !mapInstance.current || !sucursales) return;

        const map = mapInstance.current;

        // Limpiar marcadores anteriores
        markersRef.current.forEach(marker => {
            if (marker && marker.remove) {
                marker.remove();
            }
        });
        markersRef.current = [];

        // Agregar nuevos marcadores
        sucursales.forEach(sucursal => {
            if (!sucursal.position || !sucursal.position.lat || !sucursal.position.lng) {
                console.warn('Sucursal sin posición válida:', sucursal);
                return;
            }

            const marker = L.marker([sucursal.position.lat, sucursal.position.lng], {
                title: sucursal.nombreSucursal
            })
                .addTo(map)
                .bindPopup(`<b>${sucursal.nombreSucursal}</b><br>${sucursal.direccion || ''}`);

            markersRef.current.push(marker);

            // Resaltar marcador seleccionado
            if (selectedSucursal && selectedSucursal.id === sucursal.id) {
                marker.openPopup();
            }
        });
    }, [sucursales, selectedSucursal, mapReady]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '500px',
                width: '100%',
                position: 'relative', // Añade esto
                zIndex: 0, // Asegura un z-index bajo
                backgroundColor: '#f0f0f0'
            }}
        />
    );
}

    export default MapComponent;