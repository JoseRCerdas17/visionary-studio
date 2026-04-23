"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("admin_token", data.access_token);
        router.push("/admin");
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div>
            <span className="text-white font-black text-2xl tracking-widest uppercase">Visionary Studio</span>
            <span className="text-gold font-black text-2xl italic tracking-widest uppercase"> Barber Shop</span>
          </div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mt-2">
            Panel de Administración
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
              Usuario
            </label>
            <input
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button onClick={handleLogin} disabled={cargando} className="btn-gold w-full uppercase tracking-widest text-sm py-4 mt-2 disabled:opacity-50">
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">
          Solo personal autorizado de Visionary Studio
        </p>

      </div>
    </div>
  );
}
