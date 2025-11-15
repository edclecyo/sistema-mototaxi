// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import RequestRide from "./pages/RequestRide";
import DriverDashboard from "./pages/driver/DriverDashboard";
import { MapProvider } from "./MapProvider"; // import do MapProvider

export default function App() {
  return (
    <MapProvider>
      <BrowserRouter>
        <Routes>
          {/* Páginas principais */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/request-ride" element={<RequestRide />} />

          {/* Painel do motorista */}
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
        </Routes>
      </BrowserRouter>
    </MapProvider>
  );
}
