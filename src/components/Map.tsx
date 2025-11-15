import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useState } from "react";

const containerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "1rem",
};

const center = {
  lat: -7.229, // coordenadas iniciais da sua cidade
  lng: -35.881,
};

export default function Map() {
  const [markerPosition, setMarkerPosition] = useState(center);

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        onClick={(e) =>
          e.latLng &&
          setMarkerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() })
        }
      >
        <Marker position={markerPosition} />
      </GoogleMap>
    </LoadScript>
  );
}
