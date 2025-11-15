import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-yellow-400 to-yellow-600 text-gray-900">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-yellow-500/20 backdrop-blur-md shadow-md">
        <h1
          className="text-2xl md:text-3xl font-extrabold tracking-tight cursor-pointer"
          onClick={() => navigate("/")}
        >
          MotoTáxi <span className="text-white">Rápido</span>
        </h1>
        <button
          onClick={() => navigate("/login")}
          className="bg-white text-yellow-600 px-5 py-2 rounded-lg font-semibold hover:bg-yellow-50 hover:scale-105 transition-transform duration-200"
        >
          Entrar
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center flex-1 px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">
          Peça uma corrida de mototáxi em segundos!
        </h2>
        <p className="text-lg md:text-xl mb-10 text-gray-800 font-medium max-w-lg">
          Rápido, seguro e com o melhor preço da cidade.
        </p>

        <div className="flex flex-col md:flex-row gap-5">
          <button
            onClick={() => navigate("/request-ride")}
            className="bg-white text-yellow-700 px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:scale-105 transition-transform duration-200"
          >
            Pedir Corrida
          </button>

          <button
            onClick={() => navigate("/driver-dashboard")}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg hover:bg-gray-800 transition"
          >
            Sou Motorista
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-white/80 bg-yellow-600/30">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold">MotoTáxi Rápido</span> — Todos os direitos reservados
      </footer>
    </div>
  );
}
