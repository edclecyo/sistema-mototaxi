// src/pages/auth/Login.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [userType, setUserType] = useState<"user" | "driver">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    // Simulação de login
    if (userType === "driver") {
      alert("Login de motorista realizado com sucesso!");
      navigate("/driver-dashboard");
    } else {
      alert("Login de usuário realizado com sucesso!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-400 to-yellow-600 p-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-yellow-600">
          Entrar no MotoTáxi Rápido
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Acesse sua conta para continuar
        </p>

        {/* Alternar tipo de login */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setUserType("user")}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              userType === "user"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            Usuário
          </button>
          <button
            onClick={() => setUserType("driver")}
            className={`px-4 py-2 rounded-full font-semibold transition ${
              userType === "driver"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            Motorista
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>

          <button
            type="submit"
            className="bg-yellow-500 text-white py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Não tem uma conta?{" "}
          <button
            onClick={() => alert("Tela de cadastro em desenvolvimento.")}
            className="text-yellow-600 font-semibold hover:underline"
          >
            Cadastre-se
          </button>
        </p>
      </div>

      <button
        onClick={() => navigate("/")}
        className="mt-6 text-white font-semibold underline hover:text-yellow-200 transition"
      >
        ← Voltar para Home
      </button>
    </div>
  );
}
