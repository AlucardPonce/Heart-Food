import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../src/Components UI/Navbar';
import Sidebar from '../../src/Components UI/Sidebar';
import Footer from './Footer';
import "./Styles/main.css";

const MainLayout = () => {
    return (
        <div>
            <Navbar />
            <Sidebar />
            <main style={{ marginLeft:"80px", marginTop:"60px" }}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
