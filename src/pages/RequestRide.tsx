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

  const [animatedMoto, setAnimatedMoto] = useState<google.maps.LatLngLiteral | null>(null);
  const [motoRotation, setMotoRotation] = useState(0);

  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [traveledPath, setTraveledPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [progress, setProgress] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [rideConfirmed, setRideConfirmed] = useState(false);
  const [mapInteractive, setMapInteractive] = useState(true);

  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const originAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const containerStyle = { width: "100%", height: "300px", borderRadius: "12px" };
  const defaultCenter = { lat: -7.491248, lng: -38.977231 };
  const destinationIcon = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

  const PRICE_PER_KM = 3;
  const MIN_FARE = 3;

  const handleMapLoad = (map: google.maps.Map) => { mapRef.current = map; };

  const handleOriginAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => { originAutoRef.current = autocomplete; };
  const handleDestinationAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => { destinationAutoRef.current = autocomplete; };

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

  useEffect(() => {
    const updateRoute = async () => {
      if (!originMarker || !destinationMarker) return;
      const service = new google.maps.DirectionsService();
      const result = await service.route({ origin: originMarker, destination: destinationMarker, travelMode: google.maps.TravelMode.DRIVING });
      if (!result.routes.length) return;
      setDirections(result);
      const leg = result.routes[0].legs[0];
      setDistance(leg.distance?.text || "");
      setDuration(leg.duration?.text || "");
      const km = (leg.distance?.value || 0) / 1000;
      const raw = km * PRICE_PER_KM;
      const cent = raw % 1;
      const rounded = cent <= 0.5 ? Math.floor(raw) + 0.5 : Math.floor(raw) + 0.99;
      setEstimatedPrice(Math.max(rounded, MIN_FARE));
    };
    updateRoute();
  }, [originMarker, destinationMarker]);

  useEffect(() => {
    if (!rideConfirmed || !directions || !originMarker) return;
    const randomOffset = () => (Math.random() - 0.5) / 100;
    const motoStart = { lat: originMarker.lat + randomOffset(), lng: originMarker.lng + randomOffset() };
    setAnimatedMoto(motoStart);

    const animateMovement = async (start: google.maps.LatLngLiteral, end: google.maps.LatLngLiteral, stepTime: number) => {
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const lat = start.lat + ((end.lat - start.lat) * i) / steps;
        const lng = start.lng + ((end.lng - start.lng) * i) / steps;
        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        setMotoRotation(angle);
        setAnimatedMoto({ lat, lng });
        await new Promise((res) => setTimeout(res, stepTime));
      }
    };

    const moveToOrigin = async () => {
      toast.info("Moto a caminho...");
      await animateMovement(motoStart, originMarker, 50);
      toast.success("Moto chegou! Embarcando...");
      await new Promise((r) => setTimeout(r, 1500));
      startTrip();
    };

    const startGPS = () => {
      if (!navigator.geolocation) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => setAnimatedMoto({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Falhou o GPS"),
        { enableHighAccuracy: true }
      );
    };

    const startTrip = () => {
      const serviceRoute = directions.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      setPath(serviceRoute);
      setTraveledPath([serviceRoute[0]]);
      setMapInteractive(false);
      startGPS();
    };

    moveToOrigin();

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [rideConfirmed, directions, originMarker]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!mapInteractive || rideConfirmed || !event.latLng) return;
    const latlng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setDestinationMarker(latlng);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latlng }, (results, status) => { if (status === "OK" && results && results[0]) setDestination(results[0].formatted_address); });
  };

  const handleConfirmRide = () => {
    if (!destinationMarker) return toast.error("Selecione um destino!");
    setRideConfirmed(true);
    toast.info("Corrida confirmada!");
  };

  const requestDriver = () => {
    if (!originMarker) { toast.warning("Aguardando localização da origem..."); return; }
    const offset = () => (Math.random() - 0.5) / 50;
    const simulatedDriver = { lat: originMarker.lat + offset(), lng: originMarker.lng + offset() };
    setAnimatedMoto(simulatedDriver);
    toast.info("🔎 Encontrando moto próxima...");
    setTimeout(() => { setRideConfirmed(true); toast.success("🛵 Moto a caminho!"); }, 700);
  };

  const handleEndRide = () => {
    toast.success("Corrida finalizada!");
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    setDestination(""); setDestinationMarker(null); setEstimatedPrice(null); setDistance(""); setDuration("");
    setDirections(undefined); setPath([]); setTraveledPath([]); setProgress(0); setArrived(false); setRideConfirmed(false);
    setAnimatedMoto(null); setMotoRotation(0); setMapInteractive(true);
    setTimeout(() => getCurrentLocation(), 500);
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
            <Autocomplete onLoad={handleOriginAutocompleteLoad} onPlaceChanged={() => {
              const place = originAutoRef.current?.getPlace();
              if (place?.formatted_address) setOrigin(place.formatted_address);
            }}>
              <input className="w-full border rounded-lg p-2" placeholder="Digite sua origem" value={origin} disabled={rideConfirmed} onChange={(e) => setOrigin(e.target.value)} />
            </Autocomplete>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Destino</label>
            <Autocomplete onLoad={handleDestinationAutocompleteLoad} onPlaceChanged={() => {
              if (rideConfirmed) return;
              const place = destinationAutoRef.current?.getPlace();
              if (place?.formatted_address) setDestination(place.formatted_address);
              if (place?.geometry?.location) setDestinationMarker({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
            }}>
              <input className="w-full border rounded-lg p-2" placeholder="Digite o destino" value={destination} disabled={rideConfirmed} onChange={(e) => setDestination(e.target.value)} />
            </Autocomplete>
          </div>

          {estimatedPrice && !rideConfirmed && (
            <div className="bg-yellow-50 p-4 rounded-xl text-center">
              <p className="font-semibold text-lg">Distância: {distance}</p>
              <p className="font-semibold text-lg">Duração: {duration}</p>
              <p className="text-green-600 text-xl font-bold mb-3">💰 R$ {estimatedPrice.toFixed(2).replace(".", ",")}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleConfirmRide} className="bg-green-600 text-white px-6 py-2 rounded-lg">Confirmar Corrida</button>
                <button onClick={requestDriver} className="bg-black text-white px-4 py-2 rounded-lg">Chamar Moto</button>
              </div>
            </div>
          )}

          <div className="w-full max-w-md mt-6">
            <GoogleMap mapContainerStyle={containerStyle} center={originMarker || defaultCenter} zoom={14} onLoad={handleMapLoad} onClick={handleMapClick}>
              {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: "#000", strokeWeight: 4 }, suppressMarkers: true }} />}
              {path.length > 1 && <Polyline path={path} options={{ strokeColor: "#000", strokeOpacity: 0.4, strokeWeight: 4 }} />}
              {traveledPath.length > 1 && <Polyline path={traveledPath} options={{ strokeColor: "#f5c014", strokeWeight: 5 }} />}

              {originMarker && <Marker position={originMarker} icon={{ url: personIcon }} />}
              {animatedMoto && <Marker position={animatedMoto} icon={{ url: motoIcon }} />}
              {destinationMarker && <Marker position={destinationMarker} icon={{ url: destinationIcon }} />}
            </GoogleMap>
          </div>

          {rideConfirmed && !arrived && (
            <div className="mt-4 text-center">
              <p className="font-medium text-gray-700 mb-1">🛵 A caminho do destino ({progress.toFixed(0)}%)</p>
              <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden"><div className="bg-green-500 h-3 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          {arrived && (
            <div className="text-center mt-4">
              <p className="text-green-600 font-semibold animate-pulse mb-3">Corrida finalizada!</p>
              <button onClick={handleEndRide} className="bg-red-500 text-white px-6 py-2 rounded-lg">Encerrar Corrida</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
