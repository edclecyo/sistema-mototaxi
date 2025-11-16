

// src/pages/RequestRide.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  Polyline,
  Autocomplete,
} from "@react-google-maps/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import personIcon from "../assets/icons/pessoa.png";
import motoIcon from "../assets/icons/moto.png";

export default function RequestRide() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const [directions, setDirections] = useState<google.maps.DirectionsResult>();
  const [originMarker, setOriginMarker] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationMarker, setDestinationMarker] = useState<google.maps.LatLngLiteral | null>(null);

  const [availableMotos, setAvailableMotos] = useState<google.maps.LatLngLiteral[]>([
    { lat: -7.4905, lng: -38.976 },
    { lat: -7.492, lng: -38.978 },
    { lat: -7.491, lng: -38.9795 },
  ]);

  const [activeMoto, setActiveMoto] = useState<google.maps.LatLngLiteral | null>(null);
  const [motoRotation, setMotoRotation] = useState(0);
  const [traveledPath, setTraveledPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [progress, setProgress] = useState(0);
  const [rideConfirmed, setRideConfirmed] = useState(false);
  const [passengerPicked, setPassengerPicked] = useState(false);

  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const originAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const motoAnimationRef = useRef<NodeJS.Timeout | null>(null);

  const containerStyle = { width: "100%", height: "300px", borderRadius: "12px" };
  const defaultCenter = { lat: -7.491248, lng: -38.977231 };
  const destinationIcon = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

  const PRICE_PER_KM = 3;
  const MIN_FARE = 3;

  const handleMapLoad = (map: google.maps.Map) => { mapRef.current = map; };

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

  // Calcula rota e retorna path para animação
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

  // Anima moto de forma suave pelo path
  const animateMotoAlongPath = (path: google.maps.LatLngLiteral[], onComplete?: () => void) => {
    if (!path || path.length < 2) return;

    let index = 0;
    const stepTime = 50; // ms
    const stepDistance = 0.00005;

    const moveStep = () => {
      if (!activeMoto) {
        setActiveMoto(path[0]);
      }

      if (index >= path.length - 1) {
        if (onComplete) onComplete();
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

      if (Math.abs(lat - end.lat) < 0.00001 && Math.abs(lng - end.lng) < 0.00001) {
        index++;
      }

      motoAnimationRef.current = setTimeout(moveStep, stepTime);
    };

    moveStep();
  };

  // Confirmar corrida
  const handleConfirmRide = async () => {
    if (!originMarker || !destinationMarker) return toast.error("Selecione origem e destino!");
    if (availableMotos.length === 0) return toast.error("Nenhuma moto disponível!");

    setRideConfirmed(true);

    const closestMoto = availableMotos.reduce((prev, curr) => {
      const dPrev = Math.hypot(prev.lat - originMarker.lat, prev.lng - originMarker.lng);
      const dCurr = Math.hypot(curr.lat - originMarker.lat, curr.lng - originMarker.lng);
      return dCurr < dPrev ? curr : prev;
    }, availableMotos[0]);

    setActiveMoto(closestMoto);
    toast.info("🛵 Moto a caminho do passageiro...");

    const pathToPassenger = await calculateRoute(closestMoto, originMarker);
    animateMotoAlongPath(pathToPassenger, () => {
      setPassengerPicked(true);
      toast.success("🛵 Passageiro embarcado!");
    });
  };

  // Finalizar corrida
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
    setPassengerPicked(false);
    setMotoRotation(0);
    getCurrentLocation();
  };

  // Clique no mapa
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
            <Autocomplete 
              onLoad={auto => originAutoRef.current = auto} 
              onPlaceChanged={async () => {
                const place = originAutoRef.current?.getPlace();
                if (!place?.geometry?.location) return;
                const latlng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                setOriginMarker(latlng);
                setOrigin(place.formatted_address || "");
                mapRef.current?.panTo(latlng);
                if (destinationMarker) await calculateRoute(latlng, destinationMarker);
              }}
            >
              <input className="w-full border rounded-lg p-2" placeholder="Digite sua origem" value={origin} onChange={e => setOrigin(e.target.value)} disabled={rideConfirmed}/>
            </Autocomplete>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Destino</label>
            <Autocomplete 
              onLoad={auto => destinationAutoRef.current = auto} 
              onPlaceChanged={async () => {
                if (rideConfirmed) return;
                const place = destinationAutoRef.current?.getPlace();
                if (!place?.geometry?.location) return;
                const latlng = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                setDestinationMarker(latlng);
                setDestination(place.formatted_address || "");
                setDirections(undefined);
                setTraveledPath([]);
                if (originMarker) await calculateRoute(originMarker, latlng);
              }}
            >
              <input className="w-full border rounded-lg p-2" placeholder="Digite o destino" value={destination} onChange={e => setDestination(e.target.value)} disabled={rideConfirmed}/>
            </Autocomplete>
          </div>

          {estimatedPrice && !rideConfirmed && (
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="font-semibold text-lg">Distância: {distance}</p>
              <p className="font-semibold text-lg">Duração: {duration}</p>
              <p className="text-green-600 text-xl font-bold mb-3">💰 R$ {estimatedPrice.toFixed(2).replace(".", ",")}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleConfirmRide} className="bg-green-600 text-white px-6 py-2 rounded-lg">Confirmar Corrida</button>
              </div>
            </div>
          )}

          {rideConfirmed && (
            <div className="mt-4 text-center flex flex-col items-center gap-2">
              <p className="font-medium text-gray-700 mb-1">
                🛵 {passengerPicked ? "A caminho do destino" : "A caminho do passageiro"} ({progress.toFixed(0)}%)
              </p>
              <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden">
                <div className="bg-green-500 h-3 transition-all" style={{ width: `${progress}%` }} />
              </div>
              {passengerPicked && (
                <button
                  onClick={handleEndRide}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg mt-3"
                >
                  Encerrar Corrida
                </button>
              )}
            </div>
          )}

          <div className="w-full max-w-md mt-6">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={originMarker || defaultCenter}
              zoom={14}
              onLoad={handleMapLoad}
              onClick={handleMapClick}
            >
              {availableMotos.map((moto, idx) => (
                <Marker key={idx} position={moto} icon={{ url: motoIcon, scaledSize: new window.google.maps.Size(40, 40) }} />
              ))}
              {activeMoto && <Marker position={activeMoto} icon={{
                url: motoIcon,
                scaledSize: new window.google.maps.Size(50, 50),
                rotation: motoRotation,
                anchor: new window.google.maps.Point(25, 25)
              }} />}
              {originMarker && <Marker position={originMarker} icon={{ url: personIcon, scaledSize: new window.google.maps.Size(40, 40) }} />}
              {destinationMarker && <Marker position={destinationMarker} icon={{ url: destinationIcon, scaledSize: new window.google.maps.Size(45, 45) }} />}
              {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: "#000", strokeWeight: 4 }, suppressMarkers: true }} />}
              {traveledPath.length > 1 && <Polyline path={traveledPath} options={{ strokeColor: "#f5c014", strokeWeight: 5 }} />}
            </GoogleMap>
          </div>
        </div>
      </main>
    </div>
  );
}
