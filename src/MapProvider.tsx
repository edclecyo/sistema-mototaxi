// src/MapProvider.tsx
import { createContext, useContext, ReactNode, useState } from "react";
import { LoadScript } from "@react-google-maps/api";

interface MapContextType {
  mapRef: google.maps.Map | null;
  setMapRef: (map: google.maps.Map) => void;
}

const MapContext = createContext<MapContextType>({
  mapRef: null,
  setMapRef: () => {},
});

export const useMapContext = () => useContext(MapContext);

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider = ({ children }: MapProviderProps) => {
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <MapContext.Provider value={{ mapRef, setMapRef }}>
      <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
        {children}
      </LoadScript>
    </MapContext.Provider>
  );
};
