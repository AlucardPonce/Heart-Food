import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../src/Components UI/Navbar';
import Sidebar from '../../src/Components UI/Sidebar';
import Footer from './Footer';
import "./Styles/main.css";
import { message } from "antd";

const MainLayout = () => {
    const [updates, setUpdates] = useState([]);

    useEffect(() => {
        let eventSource = new EventSource("https://heart-food-back.onrender.com/events");

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setUpdates(prev => [...prev, data]);
            message.info(`📢 ${data.message}`);
        };

        eventSource.onerror = () => {
            console.error("Error en SSE, reconectando...");
            eventSource.close();
            setTimeout(() => {
                eventSource = new EventSource("https://heart-food-back.onrender.com/events");
            }, 5000);
        };

        return () => eventSource.close(); 
    }, []);

    return (
        <div>
            <Navbar />
            <Sidebar />
            <main style={{ marginLeft:"80px", marginTop:"60px" }}>
                <Outlet />
            </main>
            <Footer />

            {/* 📌 Mostrar lista de eventos recientes (opcional) */}
            <div style={{ position: "fixed", bottom: "10px", right: "10px", background: "#333", color: "#fff", padding: "10px", borderRadius: "5px" }}>
                <h4>📡 Últimas actualizaciones</h4>
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {updates.slice(-5).map((update, index) => (
                        <li key={index}>🛒 {update.message} - {new Date(update.timestamp).toLocaleTimeString()}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default MainLayout;
