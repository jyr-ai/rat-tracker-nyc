/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { format, parseISO, startOfDay, subDays, isWithinInterval } from 'date-fns';
import { 
  Rat, 
  MapPin, 
  Calendar, 
  Filter, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Search,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchRecentRatSightings } from './services/nycDataService';
import { RatSighting, NYC_BOROUGHS } from './types';
import { cn } from './lib/utils';

const COLORS = ['#141414', '#404040', '#737373', '#A3A3A3', '#D4D4D4'];

// Custom Rat Icon for Leaflet
const ratIcon = L.divIcon({
  html: `<div class="bg-[#141414] p-1 rounded-full border border-[#E4E3E0] shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E4E3E0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 5c0-1.7-1.3-3-3-3s-3 1.3-3 3c0 .8.3 1.5.8 2.1l-1.1 1.1c-.6-.5-1.4-.8-2.2-.8-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2.1-.8l1.1 1.1c-.5.6-.8 1.4-.8 2.2 0 1.7 1.3 3 3 3s3-1.3 3-3c0-.8-.3-1.5-.8-2.1l1.1-1.1c.6.5 1.4.8 2.2.8 1.7 0 3-1.3 3-3s-1.3-3-3-3c-.8 0-1.5.3-2.1.8l-1.1-1.1c.5-.6.8-1.4.8-2.2z"/><path d="M12 12l-2-2"/><path d="M12 12l2 2"/><path d="M12 12l2-2"/><path d="M12 12l-2 2"/></svg>
        </div>`,
  className: 'custom-rat-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to handle map centering
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11);
  }, [center, map]);
  return null;
}

export default function App() {
  const [sightings, setSightings] = useState<RatSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBorough, setFilterBorough] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSighting, setSelectedSighting] = useState<RatSighting | null>(null);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRecentRatSightings(1000);
      setSightings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load NYC rat data. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSightings = useMemo(() => {
    return sightings.filter(s => {
      const matchesBorough = filterBorough === 'ALL' || s.borough === filterBorough;
      const matchesSearch = s.incident_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.descriptor?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBorough && matchesSearch;
    });
  }, [sightings, filterBorough, searchTerm]);

  const stats = useMemo(() => {
    const boroughCounts = sightings.reduce((acc, s) => {
      acc[s.borough] = (acc[s.borough] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const boroughData = Object.entries(boroughCounts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => Number(b.value) - Number(a.value));

    // Group by day for the last 14 days
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    const trendData = last14Days.map(dateStr => {
      const count = sightings.filter(s => s.created_date.startsWith(dateStr)).length;
      return {
        date: format(parseISO(dateStr), 'MMM dd'),
        count
      };
    });

    return { boroughData, trendData };
  }, [sightings]);

  const paginatedSightings = filteredSightings.slice(Number(page) * itemsPerPage, (Number(page) + 1) * itemsPerPage);

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedSighting && selectedSighting.latitude && selectedSighting.longitude) {
      return [Number(selectedSighting.latitude), Number(selectedSighting.longitude)];
    }
    return [40.7128, -74.0060]; // NYC Center
  }, [selectedSighting]);

  if (loading && sightings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#E4E3E0]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-12 h-12 text-[#141414]" />
        </motion.div>
        <p className="mt-4 font-mono text-sm uppercase tracking-widest">Scanning NYC Infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="mb-12 border-b border-[#141414] pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#141414] p-2 rounded">
              <Rat className="text-[#E4E3E0] w-6 h-6" />
            </div>
            <h1 className="text-4xl font-serif italic font-bold tracking-tight">NYC Rat Tracker</h1>
          </div>
          <p className="font-mono text-xs uppercase opacity-60">Live 311 Rodent Sighting Dashboard • Open Data Portal</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded border border-[#141414]/10">
            <Filter className="w-4 h-4 opacity-60" />
            <select 
              value={filterBorough}
              onChange={(e) => { setFilterBorough(e.target.value); setPage(0); }}
              className="bg-transparent border-none focus:ring-0 text-xs font-mono uppercase cursor-pointer"
            >
              <option value="ALL">All Boroughs</option>
              {NYC_BOROUGHS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          
          <button 
            onClick={loadData}
            className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 rounded hover:opacity-90 transition-opacity text-xs font-mono uppercase"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-4 bg-red-100 border border-red-200 text-red-800 rounded flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 border border-[#141414]/10 rounded-lg shadow-sm"
        >
          <p className="col-header mb-4">Total Recent Sightings</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-mono font-bold">{sightings.length}</span>
            <span className="text-xs font-mono opacity-40 uppercase">Last 1000 reports</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-red-600">
            <TrendingUp className="w-4 h-4" />
            <span>Active monitoring in progress</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 border border-[#141414]/10 rounded-lg shadow-sm md:col-span-2"
        >
          <p className="col-header mb-4">14-Day Sighting Trend</p>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontFamily: 'Courier New' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '4px' }}
                  itemStyle={{ color: '#E4E3E0', fontSize: '12px', fontFamily: 'Courier New' }}
                  labelStyle={{ color: '#E4E3E0', fontSize: '10px', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#141414" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#141414' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Charts & Map */}
        <div className="space-y-8">
          {/* Interactive Map */}
          <section className="bg-white p-6 border border-[#141414]/10 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="col-header">Geospatial Distribution</h2>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase opacity-40">
                <MapPin className="w-3 h-3" />
                <span>Live Map</span>
              </div>
            </div>
            <div className="h-[400px] w-full relative rounded-lg overflow-hidden border border-[#141414]/10">
              <MapContainer 
                center={mapCenter} 
                zoom={11} 
                scrollWheelZoom={false}
                zoomControl={true}
              >
                <ChangeView center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredSightings.slice(0, 200).map((s) => (
                  s.latitude && s.longitude && (
                    <Marker 
                      key={s.unique_key} 
                      position={[Number(s.latitude), Number(s.longitude)]}
                      icon={ratIcon}
                    >
                      <Popup>
                        <div className="p-1">
                          <p className="font-bold mb-1">{s.incident_address}</p>
                          <p className="opacity-70">{s.borough}</p>
                          <p className="mt-2 text-[9px] uppercase">{format(parseISO(s.created_date), 'MMM dd, yyyy')}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            </div>
          </section>

          <section className="bg-white p-6 border border-[#141414]/10 rounded-lg shadow-sm">
            <h2 className="col-header mb-6">Distribution by Borough</h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.boroughData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontFamily: 'Courier New' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(20, 20, 20, 0.05)' }}
                    contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '4px' }}
                    itemStyle={{ color: '#E4E3E0', fontSize: '12px', fontFamily: 'Courier New' }}
                  />
                  <Bar dataKey="value" fill="#141414" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right Column: Data Table */}
        <div className="lg:col-span-2">
          <section className="bg-white border border-[#141414]/10 rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#141414]/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="col-header">Recent Incident Logs</h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input 
                  type="text"
                  placeholder="Search address..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  className="w-full pl-10 pr-4 py-2 bg-[#E4E3E0]/30 border border-[#141414]/10 rounded text-xs font-mono focus:outline-none focus:border-[#141414]/30"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="data-row bg-[#141414]/5">
                  <span className="col-header">Date</span>
                  <span className="col-header">Location</span>
                  <span className="col-header">Borough</span>
                  <span className="col-header">Status</span>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={page + filterBorough + searchTerm}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {paginatedSightings.length > 0 ? (
                      paginatedSightings.map((s) => (
                        <div 
                          key={s.unique_key} 
                          className={cn(
                            "data-row group cursor-pointer",
                            selectedSighting?.unique_key === s.unique_key && "bg-[#141414] text-[#E4E3E0]"
                          )}
                          onClick={() => setSelectedSighting(s)}
                        >
                          <span className="data-value text-[11px]">
                            {format(parseISO(s.created_date), 'MMM dd, HH:mm')}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold truncate">{s.incident_address || 'N/A'}</span>
                            <span className="text-[10px] opacity-60 truncate">{s.location_type}</span>
                          </div>
                          <span className="data-value text-[11px] uppercase">{s.borough}</span>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              s.status === 'Open' ? "bg-red-500 animate-pulse-red" : "bg-green-500"
                            )} />
                            <span className="text-[10px] font-mono uppercase">{s.status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center font-mono text-xs opacity-40">
                        No sightings found matching criteria.
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-[#141414]/10 flex justify-between items-center">
              <span className="text-[10px] font-mono opacity-40 uppercase">
                Showing {Number(page) * itemsPerPage + 1} - {Math.min((Number(page) + 1) * itemsPerPage, filteredSightings.length)} of {filteredSightings.length}
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1 rounded hover:bg-[#141414]/5 disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  disabled={(Number(page) + 1) * itemsPerPage >= filteredSightings.length}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1 rounded hover:bg-[#141414]/5 disabled:opacity-20 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          {/* Location Detail Card (Conditional) */}
          {selectedSighting && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-[#141414] text-[#E4E3E0] p-6 rounded-lg shadow-xl border border-[#E4E3E0]/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="col-header text-[#E4E3E0]/60 mb-1">Selected Incident</p>
                  <h3 className="text-xl font-serif italic font-bold">{selectedSighting.incident_address}</h3>
                </div>
                <button 
                  onClick={() => setSelectedSighting(null)}
                  className="text-[10px] font-mono uppercase opacity-60 hover:opacity-100"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Borough</p>
                  <p className="text-xs font-mono">{selectedSighting.borough}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Type</p>
                  <p className="text-xs font-mono">{selectedSighting.location_type}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Status</p>
                  <p className="text-xs font-mono">{selectedSighting.status}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Reported</p>
                  <p className="text-xs font-mono">{format(parseISO(selectedSighting.created_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-[#E4E3E0]/10">
                <p className="text-[9px] font-mono uppercase opacity-40 mb-2">Resolution Description</p>
                <p className="text-xs opacity-80 leading-relaxed">
                  {selectedSighting.resolution_description || 'No resolution details provided yet.'}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[#141414]/10 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase opacity-40">
            <MapPin className="w-3 h-3" />
            <span>New York City</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase opacity-40">
            <Calendar className="w-3 h-3" />
            <span>Last Updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase opacity-40">
          Data sourced from NYC Open Data (311 Service Requests)
        </p>
      </footer>
    </div>
  );
}

