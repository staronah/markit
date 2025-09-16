import type { GeoLocation } from '../types';

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param start - The starting point with latitude and longitude.
 * @param end - The ending point with latitude and longitude.
 * @returns The distance in meters.
 */
export function getHaversineDistance(start: GeoLocation, end: GeoLocation): number {
  const R = 6371e3; // Radius of Earth in meters
  const lat1 = start.latitude * Math.PI / 180; // φ, λ in radians
  const lat2 = end.latitude * Math.PI / 180;
  const deltaLat = (end.latitude - start.latitude) * Math.PI / 180;
  const deltaLon = (end.longitude - start.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
}