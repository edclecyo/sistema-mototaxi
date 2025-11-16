// src/pages/RequestRide.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  Polyline,
  Autocomplete,
  Circle,
  InfoWindow,
} from "@react-google-maps/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import personIcon from "../assets/icons/pessoa.png";
import motoIcon from "../assets/icons/moto.png";

/**
 * RequestRide.tsx
 * Atualizado: mostra motorista mais próximo, permite clicar no motorista para ver info e chamá-lo.
 */

type DriverProfile = {
  id: number;
  name: string;
  photo: string;
  rating: number;
  bike: string;
  plate: string;
};

export default function RequestRide() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const [directions, setDirections] = useState<google.maps.DirectionsResult | undefined>();
  const [originMarker, setOriginMarker] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationMarker, setDestinationMarker] = useState<google.maps.LatLngLiteral | null>(null);

  // motos + drivers
  const [availableMotos, setAvailableMotos] = useState<google.maps.LatLngLiteral[]>([
    { lat: -7.4905, lng: -38.976 },
    { lat: -7.492, lng: -38.978 },
    { lat: -7.491, lng: -38.9795 },
  ]);

  const DEFAULT_DRIVERS: DriverProfile[] = [
    { id: 0, name: "Carlos", photo: "https://i.pravatar.cc/80?img=12", rating: 4.9, bike: "Yamaha NMax", plate: "ABC-1234" },
    { id: 1, name: "Mariana", photo: "https://i.pravatar.cc/80?img=32", rating: 4.8, bike: "Honda Biz", plate: "XYZ-9876" },
    { id: 2, name: "Rafael", photo: "https://i.pravatar.cc/80?img=48", rating: 4.7, bike: "Honda CG 160", plate: "MNO-4567" },
  ];

  const [drivers] = useState<DriverProfile[]>(DEFAULT_DRIVERS);

  const [activeMoto, setActiveMoto] = useState<google.maps.LatLngLiteral | null>(null);
  const [activeDriver, setActiveDriver] = useState<DriverProfile | null>(null);
  const [selectedDriverIndex, setSelectedDriverIndex] = useState<number | null>(null); // index of availableMotos
  const [infoWindowPos, setInfoWindowPos] = useState<google.maps.LatLngLiteral | null>(null);

  const [motoRotation, setMotoRotation] = useState(0);
  const [traveledPath, setTraveledPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [progress, setProgress] = useState(0);
  const [rideConfirmed, setRideConfirmed] = useState(false);
  const [passengerPicked, setPassengerPicked] = useState(false);

  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const originAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const motoAnimationRef = useRef<number | null>(null);
  const pulseRef = useRef<number | null>(null);
  const [pulseRadius, setPulseRadius] = useState(80);

  const containerStyle = { width: "100%", height: "300px", borderRadius: "12px" };
  const defaultCenter = { lat: -7.491248, lng: -38.977231 };
  const destinationIcon = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

  const PRICE_PER_KM = 3;
  const MIN_FARE = 3;

  const handleMapLoad = (map: google.maps.Map) => { mapRef.current = map; };

  // obter localização atual
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginMarker(latlng);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === "OK" && results && results[0]) setOrigin(results[0].formatted_address);
        });
        mapRef.current?.panTo(latlng);
      },
      () => toast.error("Não foi possível obter sua localização!")
    );
  };

  useEffect(() => { getCurrentLocation(); }, []);

  // make available motos move slightly to feel alive
  useEffect(() => {
    const id = window.setInterval(() => {
      setAvailableMotos(prev => prev.map(m => ({ lat: m.lat + (Math.random() - 0.5) * 0.00025, lng: m.lng + (Math.random() - 0.5) * 0.00025 })));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  // pulsar o círculo (quando uma moto ativa estiver selecionada e ainda não pegou passageiro)
  useEffect(() => {
    if (!activeMoto || passengerPicked) {
      if (pulseRef.current) window.clearInterval(pulseRef.current);
      setPulseRadius(80);
      return;
    }
    if (pulseRef.current) window.clearInterval(pulseRef.current);
    pulseRef.current = window.setInterval(() => {
      setPulseRadius(prev => (prev >= 120 ? 80 : prev + 2));
    }, 50);
    return () => { if (pulseRef.current) window.clearInterval(pulseRef.current); };
  }, [activeMoto, passengerPicked]);

  // calcula rota e retorna path simplificado para animação
  const calculateRoute = async (start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral) => {
    if (!start || !end) return [];
    const service = new google.maps.DirectionsService();
    const result = await service.route({
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirections(result);

    const leg = result.routes[0].legs[0];
    setDistance(leg.distance?.text || "");
    setDuration(leg.duration?.text || "");
    const km = (leg.distance?.value || 0) / 1000;
    const raw = km * PRICE_PER_KM;
    const cent = raw % 1;
    const rounded = cent <= 0.5 ? Math.floor(raw) + 0.5 : Math.floor(raw) + 0.99;
    setEstimatedPrice(Math.max(rounded, MIN_FARE));

    return result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
  };

  // anima moto suavemente pelo path
  const animateMotoAlongPath = (path: google.maps.LatLngLiteral[], onComplete?: () => void) => {
    if (!path || path.length < 2) {
      onComplete?.();
      return;
    }

    let index = 0;
    const stepTime = 50;
    const stepDistance = 0.00005;

    const moveStep = () => {
      if (!activeMoto) setActiveMoto(path[0]);

      if (index >= path.length - 1) {
        onComplete?.();
        return;
      }

      const start = path[index];
      const end = path[index + 1];

      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      const lat = activeMoto!.lat + Math.sign(dy) * Math.min(Math.abs(dy), stepDistance);
      const lng = activeMoto!.lng + Math.sign(dx) * Math.min(Math.abs(dx), stepDistance);

      setActiveMoto({ lat, lng });
      setMotoRotation(angle);
      setTraveledPath(prev => [...prev, { lat, lng }]);
      setProgress(((index + 1) / path.length) * 100);

      if (Math.abs(lat - end.lat) < 0.00001 && Math.abs(lng - end.lng) < 0.00001) index++;

      motoAnimationRef.current = window.setTimeout(moveStep, stepTime);
    };

    moveStep();
  };

  // achar moto mais próxima da origem (usado ao confirmar corrida)
  const findClosestMotoIndex = (originLatLng: google.maps.LatLngLiteral) => {
    let bestIdx = 0;
    let bestDist = Infinity;
    availableMotos.forEach((m, i) => {
      const d = Math.hypot(m.lat - originLatLng.lat, m.lng - originLatLng.lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    return bestIdx;
  };

  // chamar corrida: se motoParam fornecido, usa ela; senão usa a mais próxima
  const handleConfirmRide = async (motoParamIndex?: number) => {
    if (!originMarker || !destinationMarker) {
      toast.error("Selecione origem e destino!");
      return;
    }
    if (availableMotos.length === 0) {
      toast.error("Nenhuma moto disponível!");
      return;
    }

    setRideConfirmed(true);

    const idx = (typeof motoParamIndex === "number")
      ? motoParamIndex
      : findClosestMotoIndex(originMarker);

    const chosenMoto = availableMotos[idx];
    setActiveMoto(chosenMoto);
    setSelectedDriverIndex(idx);
    setActiveDriver(drivers[idx] ?? null);
    setInfoWindowPos(chosenMoto);
    toast.info("🛵 Moto a caminho do passageiro...");

    // caminho até passageiro
    const pathToPassenger = await calculateRoute(chosenMoto, originMarker);
    animateMotoAlongPath(pathToPassenger, async () => {
      setPassengerPicked(true);
      toast.success("🛵 Passageiro embarcado!");

      // caminho até destino
      const pathToDest = await calculateRoute(originMarker, destinationMarker);
      animateMotoAlongPath(pathToDest, () => {
        toast.success("🏁 Corrida finalizada!");
      });
    });
  };

  const handleEndRide = () => {
    if (motoAnimationRef.current) clearTimeout(motoAnimationRef.current);
    setDestination("");
    setDestinationMarker(null);
    setEstimatedPrice(null);
    setDistance("");
    setDuration("");
    setDirections(undefined);
    setTraveledPath([]);
    setProgress(0);
    setRideConfirmed(false);
    setActiveMoto(null);
    setActiveDriver(null);
    setSelectedDriverIndex(null);
    setPassengerPicked(false);
    setMotoRotation(0);
    getCurrentLocation();
  };

  // clicar no mapa para definir destino
  const handleMapClick = async (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || rideConfirmed) return;
    const latlng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setDestinationMarker(latlng);
    setDirections(undefined);
    setTraveledPath([]);
    setDistance(""); setDuration(""); setEstimatedPrice(null);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK" && results && results[0]) setDestination(results[0].formatted_address);
    });

    if (originMarker) await calculateRoute(originMarker, latlng);
  };

  // clicou em um marcador de moto — mostra info e seleciona a moto (não inicia corrida)
  const handleMotoMarkerClick = (m: google.maps.LatLngLiteral, index: number) => {
    setSelectedDriverIndex(index);
    setActiveMoto(m);
    setActiveDriver(drivers[index] ?? null);
    setInfoWindowPos(m);
  };

  // render driver info card under map or through InfoWindow
  const renderDriverInfoCard = () => {
    if (!activeDriver) return null;
    return (
      <div className="mt-3 bg-white rounded-xl shadow p-3 max-w-md w-full">
        <div className="flex items-center gap-3">
          <img src={activeDriver.photo} alt="driver" className="w-16 h-16 rounded-full object-cover" />
          <div className="flex-1">
            <div className="font-semibold">{activeDriver.name}</div>
            <div className="text-sm text-gray-500">{activeDriver.bike} • {activeDriver.plate}</div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{activeDriver.rating} ★</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleConfirmRide(selectedDriverIndex ?? undefined)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Chamar essa moto
          </button>
          {rideConfirmed ? (
            <button onClick={handleEndRide} className="bg-red-600 text-white px-4 py-2 rounded-lg">Encerrar</button>
          ) : null}
        </div>
      </div>
    );
  };

  const formatETA = (s: number | null) => {
    if (!s) return "--";
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)} min`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 relative">
      <ToastContainer position="top-center" autoClose={2500} theme="colored" />
      <header className="bg-yellow-500 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">Solicitar Corrida</h1>
        <button onClick={() => navigate("/")} className="bg-white text-yellow-600 px-4 py-1 rounded-lg">Voltar</button>
      </header>

      <main className="flex-1 px-6 py-4 flex flex-col items-center">
        <div className="bg-white shadow-md w-full max-w-md rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Peça sua mototáxi agora</h2>

          <div className="mb-4">
            <label className="block font-medium mb-1">Origem</label>
            <Autocomplete onLoad={auto => originAutoRef.current = auto} onPlaceChanged={async () => {
              const place = originAutoRef.current?.getPlace();
              if (!place?.geometry?.location) return;
              const latlng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
              setOriginMarker(latlng);
              setOrigin(place.formatted_address || "");
              mapRef.current?.panTo(latlng);
              if (destinationMarker) await calculateRoute(latlng, destinationMarker);
            }}>
              <input className="w-full border rounded-lg p-2" placeholder="Digite sua origem" value={origin} onChange={e => setOrigin(e.target.value)} disabled={rideConfirmed}/>
            </Autocomplete>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Destino</label>
            <Autocomplete onLoad={auto => destinationAutoRef.current = auto} onPlaceChanged={async () => {
              if (rideConfirmed) return;
              const place = destinationAutoRef.current?.getPlace();
              if (!place?.geometry?.location) return;
              const latlng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
              setDestinationMarker(latlng);
              setDestination(place.formatted_address || "");
              setDirections(undefined);
              setTraveledPath([]);
              if (originMarker) await calculateRoute(originMarker, latlng);
            }}>
              <input className="w-full border rounded-lg p-2" placeholder="Digite o destino" value={destination} onChange={e => setDestination(e.target.value)} disabled={rideConfirmed}/>
            </Autocomplete>
          </div>

          {estimatedPrice && !rideConfirmed && (
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="font-semibold text-lg">Distância: {distance}</p>
              <p className="font-semibold text-lg">Duração: {duration}</p>
              <p className="text-green-600 text-xl font-bold mb-3">💰 R$ {estimatedPrice.toFixed(2).replace(".", ",")}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => handleConfirmRide()} className="bg-green-600 text-white px-6 py-2 rounded-lg">Confirmar Corrida (mais próxima)</button>
              </div>
            </div>
          )}

          {rideConfirmed && (
            <div className="mt-4 text-center flex flex-col items-center gap-2">
              <p className="font-medium text-gray-700 mb-1">🛵 {passengerPicked ? "A caminho do destino" : "A caminho do passageiro"} ({progress.toFixed(0)}%)</p>
              <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden">
                <div className="bg-green-500 h-3 transition-all" style={{ width: `${progress}%` }} />
              </div>
              {passengerPicked && (
                <button onClick={handleEndRide} className="bg-red-600 text-white px-6 py-2 rounded-lg mt-3">Encerrar Corrida</button>
              )}
            </div>
          )}

          <div className="w-full max-w-md mt-6">
            <GoogleMap mapContainerStyle={containerStyle} center={originMarker || defaultCenter} zoom={14} onLoad={handleMapLoad} onClick={handleMapClick}>
              {availableMotos.map((moto, idx) => (
                <Marker
                  key={idx}
                  position={moto}
                  icon={{ url: motoIcon, scaledSize: new window.google.maps.Size(40, 40) }}
                  onClick={() => handleMotoMarkerClick(moto, idx)}
                />
              ))}

              {activeMoto && (
                <>
                  <Marker position={activeMoto} icon={{ url: motoIcon, scaledSize: new window.google.maps.Size(50, 50), rotation: motoRotation, anchor: new window.google.maps.Point(25, 25) }} />

                  {!passengerPicked && (
                    <Circle center={activeMoto} radius={pulseRadius} options={{ fillColor: "#4285F4", fillOpacity: 0.2, strokeColor: "#4285F4", strokeOpacity: 0.5, strokeWeight: 2 }} />
                  )}

                  {/* InfoWindow anchored to active moto if selected */}
                  {infoWindowPos && activeDriver && selectedDriverIndex !== null && (
                    <InfoWindow position={infoWindowPos} onCloseClick={() => { setInfoWindowPos(null); setSelectedDriverIndex(null); setActiveDriver(null); }}>
                      <div style={{ width: 220 }}>
                        <div className="flex items-center gap-2">
                          <img src={activeDriver.photo} alt="driver" style={{ width: 48, height: 48, borderRadius: 999 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{activeDriver.name}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>{activeDriver.bike}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                          <button onClick={() => handleConfirmRide(selectedDriverIndex ?? undefined)} style={{ flex: 1, background: "#16A34A", color: "white", padding: "8px", borderRadius: 8, border: "none" }}>
                            Chamar
                          </button>
                          <button onClick={() => { setInfoWindowPos(null); }} style={{ flex: 1, background: "#E5E7EB", color: "#111827", padding: "8px", borderRadius: 8, border: "none" }}>
                            Fechar
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {originMarker && <Marker position={originMarker} icon={{ url: personIcon, scaledSize: new window.google.maps.Size(40, 40) }} />}
              {destinationMarker && <Marker position={destinationMarker} icon={{ url: destinationIcon, scaledSize: new window.google.maps.Size(45, 45) }} />}
              {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: "#000", strokeWeight: 4 }, suppressMarkers: true }} />}
              {traveledPath.length > 1 && <Polyline path={traveledPath} options={{ strokeColor: "#f5c014", strokeWeight: 5 }} />}
            </GoogleMap>
          </div>

          {/* driver card (baixo do mapa) */}
          {activeDriver && (
            <div className="mt-4">
              {renderDriverInfoCard()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
