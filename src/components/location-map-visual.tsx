"use client";

import { Circle, MapContainer, TileLayer } from "react-leaflet";

export default function LocationMapVisual({
  center,
  currentCoordinates,
  officeLocations,
}: {
  center: [number, number];
  currentCoordinates: { latitude: number; longitude: number } | null;
  officeLocations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }>;
}) {
  return (
    <MapContainer center={center} scrollWheelZoom={false} style={{ height: 320, width: "100%" }} zoom={14}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {officeLocations.map((location) => (
        <Circle
          center={[location.latitude, location.longitude]}
          color="#2563eb"
          fillColor="#2563eb"
          fillOpacity={0.12}
          key={location.id}
          radius={location.radiusMeters}
        />
      ))}
      {currentCoordinates ? (
        <Circle
          center={[currentCoordinates.latitude, currentCoordinates.longitude]}
          color="#ef4444"
          fillColor="#ef4444"
          fillOpacity={0.24}
          radius={20}
        />
      ) : null}
    </MapContainer>
  );
}
