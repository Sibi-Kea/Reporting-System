"use client";

import { useState } from "react";

export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  async function requestLocation() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.");
      return null;
    }

    setIsLoading(true);
    setError(null);

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
      });
    }).catch((locationError: GeolocationPositionError) => {
      setError(locationError.message);
      return null;
    });

    setIsLoading(false);

    if (!position) {
      return null;
    }

    const nextCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setCoordinates(nextCoordinates);
    return nextCoordinates;
  }

  return {
    requestLocation,
    isLoading,
    error,
    coordinates,
  };
}
