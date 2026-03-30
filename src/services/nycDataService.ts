import { RatSighting } from '../types';

const BASE_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';

export async function fetchRecentRatSightings(limit: number = 1000): Promise<RatSighting[]> {
  // Fetching recent sightings, ordered by created_date descending
  const query = `$limit=${limit}&$order=created_date DESC`;
  const response = await fetch(`${BASE_URL}?${query}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch rat sightings from NYC Open Data');
  }
  
  return response.json();
}

export async function fetchSightingsByDateRange(startDate: string, endDate: string): Promise<RatSighting[]> {
  const query = `$where=created_date between '${startDate}' and '${endDate}'&$order=created_date DESC`;
  const response = await fetch(`${BASE_URL}?${query}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch rat sightings for date range');
  }
  
  return response.json();
}
