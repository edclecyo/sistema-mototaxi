import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Ride {
  id: number;
  passenger: string;
  location: string;
  destination: string;
  price: number;
  status: "waiting" | "accepted" | "completed";
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([
    {
      id: 1,
      passenger: "João Silva",
      location: "Rua A, Centro",
      destination: "Avenida B, Bairro Novo",
      price: 12.5,
      status: "waiting",
    },
    {
      id: 2,
      passenger: "Maria Oliveira",
      location: "Praça Central",
      destination: "Shopping Cidade",
      price: 18.0,
      status: "waiting",
    },
  ]);

  const handleAccept = (id: number) => {
    setRides((prev) =>
      prev.map((ride) =>
        ride.id === id ? { ...ride, status: "accepted" } : ride
      )
    );
  };

  const handleComplete = (id: number) => {
    setRides((prev) =>
      prev.map((ride) =>
        ride.id === id ? { ...ride, status: "completed" } : ride
      )
    );
  };

  const handleReject = (id: number) => {
    setRides((prev) => prev.filter((ride) => ride.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col">
      {/* Cabeçalho */}
      <header className="flex justify-between items-center bg-yellow-500 text-white p-4 rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">Painel do Motorista</h1>
        <button
          onClick={() => navigate("/")}
          className="bg-white text-yellow-600 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-100 transition"
        >
          Sair
        </button>
      </header>

      {/* Lista de corridas */}
      <div className="grid gap-4">
        {rides.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">
            Nenhuma corrida disponível no momento.
          </p>
        ) : (
          rides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white rounded-xl shadow-md p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-l-4 border-yellow-500"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Passageiro: {ride.passenger}
                </h2>
                <p className="text-gray-600">
                  Origem: {ride.location}
                  <br />
                  Destino: {ride.destination}
                </p>
                <p className="mt-2 font-semibold text-yellow-600">
                  R$ {ride.price.toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Status:{" "}
                  <span
                    className={
                      ride.status === "accepted"
                        ? "text-green-600 font-semibold"
                        : ride.status === "completed"
                        ? "text-blue-600 font-semibold"
                        : "text-yellow-600 font-semibold"
                    }
                  >
                    {ride.status === "waiting"
                      ? "Aguardando"
                      : ride.status === "accepted"
                      ? "Em andamento"
                      : "Concluída"}
                  </span>
                </p>
              </div>

              <div className="flex gap-2 mt-4 sm:mt-0">
                {ride.status === "waiting" && (
                  <>
                    <button
                      onClick={() => handleAccept(ride.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleReject(ride.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
                {ride.status === "accepted" && (
                  <button
                    onClick={() => handleComplete(ride.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Finalizar Corrida
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rodapé */}
      <footer className="mt-10 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} MotoTáxi Rápido — Motorista
      </footer>
    </div>
  );
}
