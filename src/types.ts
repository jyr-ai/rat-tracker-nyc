export interface RatSighting {
  unique_key: string;
  created_date: string;
  closed_date?: string;
  agency: string;
  agency_name: string;
  complaint_type: string;
  descriptor: string;
  location_type: string;
  incident_zip: string;
  incident_address: string;
  street_name: string;
  cross_street_1: string;
  cross_street_2: string;
  intersection_street_1: string;
  intersection_street_2: string;
  address_type: string;
  city: string;
  landmark: string;
  facility_type: string;
  status: string;
  due_date: string;
  resolution_description: string;
  resolution_action_updated_date: string;
  community_board: string;
  bbl: string;
  borough: string;
  x_coordinate_state_plane: string;
  y_coordinate_state_plane: string;
  open_data_channel_type: string;
  park_facility_name: string;
  park_borough: string;
  vehicle_type: string;
  taxi_company_borough: string;
  taxi_pick_up_location: string;
  bridge_highway_name: string;
  bridge_highway_direction: string;
  road_ramp: string;
  bridge_highway_segment: string;
  latitude: string;
  longitude: string;
  location: {
    latitude: string;
    longitude: string;
    human_address: string;
  };
}

export const NYC_BOROUGHS = [
  'MANHATTAN',
  'BROOKLYN',
  'QUEENS',
  'BRONX',
  'STATEN ISLAND'
];
