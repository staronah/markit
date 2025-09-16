import { useState, useEffect } from 'react';
import type { GeoLocation } from '../types';

interface GeolocationState {
  loading: boolean;
  coordinates: GeoLocation | null;
  error: string | null;
}

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    loading: true,
    coordinates: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        loading: false,
        coordinates: null,
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        loading: false,
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let errorMessage = 'Unable to retrieve your location.';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access was denied. Please enable it to start a session.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "The request to get user location timed out.";
          break;
      }
      setState({
        loading: false,
        coordinates: null,
        error: errorMessage,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });

  }, []);

  return state;
};