import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";           // Vite resolves .jsx automatically
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider, useAuth } from "./context/AuthContext";
  import axios from "axios";
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6b8a", fontFamily: "Sora, sans-serif" }}>
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
