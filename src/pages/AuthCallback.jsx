import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext"




export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      navigate("/login?error=auth_failed");
      return;
    }

    loginWithToken(token);
    navigate("/dashboard");
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#e8e8f0", fontFamily: "Sora, sans-serif", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚙️</div>
      <p>Setting up your account...</p>
    </div>
  );
}
