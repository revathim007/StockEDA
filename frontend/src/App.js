import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import StockPage from "./pages/StockPage";
import Login from "./pages/Login";
import Register from "./pages/Register";

import MyStocks from "./pages/MyStocks";
import Predict from "./pages/Predict";

function RequireAuth({ children }) {
  const token = localStorage.getItem("access");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mystocks" element={<MyStocks />} />
        
        <Route path="/predict/:symbol" element={<Predict />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/stock/:symbol"
          element={
            <RequireAuth>
              <StockPage />
            </RequireAuth>
          }
          
        />
        <Route
  path="/predict/:symbol"
  element={
    <RequireAuth>
      <Predict />
    </RequireAuth>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}