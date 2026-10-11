import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Operator = () => {
  const [gridData, setGridData] = useState([]);
  const [gridSummary, setGridSummary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ==================== User Customization Preferences ====================
  // 1. Units
  const [tempUnit, setTempUnit] = useState(() => localStorage.getItem('gp_op_tempUnit') || 'F');
  const [powerUnit, setPowerUnit] = useState(() => localStorage.getItem('gp_op_powerUnit') || 'MW');
  
  // 2. Auto-refresh interval (0 = off, 10, 30, 60 seconds)
  const [refreshInterval, setRefreshInterval] = useState(() => Number(localStorage.getItem('gp_op_refreshInterval') || 30));
  
  // 3. Reserve Margin Safety Threshold (%)
  const [alertThreshold, setAlertThreshold] = useState(() => Number(localStorage.getItem('gp_op_alertThreshold') || 25));

  // 4. View Density (comfortable vs compact)
  const [density, setDensity] = useState(() => localStorage.getItem('gp_op_density') || 'comfortable');

  // 5. Customization Panel Visibility
  const [showPreferences, setShowPreferences] = useState(false);

  // 6. Power Plant Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('All');
  const [sortBy, setSortBy] = useState('capacity-desc'); // capacity-desc, capacity-asc, name-asc, state

  // Persist settings
  useEffect(() => {
    localStorage.setItem('gp_op_tempUnit', tempUnit);
  }, [tempUnit]);

  useEffect(() => {
    localStorage.setItem('gp_op_powerUnit', powerUnit);
  }, [powerUnit]);

  useEffect(() => {
    localStorage.setItem('gp_op_refreshInterval', refreshInterval);
  }, [refreshInterval]);

  useEffect(() => {
    localStorage.setItem('gp_op_alertThreshold', alertThreshold);
  }, [alertThreshold]);

  useEffect(() => {
    localStorage.setItem('gp_op_density', density);
  }, [density]);

  // Telemetry Fetcher
  const fetchTelemetry = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setIsRefreshing(true);

    try {
      const results = await Promise.allSettled([
        axios.get('http://127.0.0.1:8000/api/grid-data?limit=10'),
        axios.get('http://127.0.0.1:8000/api/weather-data?limit=1'),
        axios.get('http://127.0.0.1:8000/api/plants-data?limit=50')
      ]);

      if (results[0].status === 'fulfilled') {
        setGridData(results[0].value.data?.data || []);
        setGridSummary(results[0].value.data?.summary || null);
      } else {
        console.error("Grid telemetry error:", results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        setWeather(results[1].value.data?.data?.[0] || null);
      } else {
        console.error("Weather telemetry error:", results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        setPlants(results[2].value.data?.data || []);
      } else {
        console.error("Plants data error:", results[2].reason);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching telemetry:", err);
    } finally {
      if (isInitial) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTelemetry(true);
  }, [fetchTelemetry]);

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchTelemetry(false);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, fetchTelemetry]);

  if (loading) return <div className="p-8 text-zinc-600">Loading live grid intelligence...</div>;

  // Formatting helpers
  const formatPower = (mw) => {
    if (mw === null || mw === undefined) return '0 MW';
    if (powerUnit === 'GW') {
      return `${(mw / 1000).toFixed(2)} GW`;
    }
    return `${Math.round(mw).toLocaleString()} MW`;
  };

  const formatTemp = (tempF) => {
    if (tempF === null || tempF === undefined) return 'N/A';
    if (tempUnit === 'C') {
      return `${Math.round((tempF - 32) * 5 / 9)}°C`;
    }
    return `${tempF}°F`;
  };

  const latestDemand = gridData.length > 0 ? gridData[0].demand_mw : 0;
  const peakDemand = gridData.length > 0 ? Math.max(...gridData.map(d => d.demand_mw)) : 0;

  // Operating Reserve Metrics
  const totalCapacity = gridSummary?.total_capacity_mw || 25838;
  const reserveCushion = gridSummary?.reserve_cushion_mw || Math.max(totalCapacity - latestDemand, 0);
  const utilizationPct = gridSummary?.utilization_pct || (totalCapacity > 0 ? (latestDemand / totalCapacity) * 100 : 0);
  const reserveMarginPct = gridSummary?.reserve_margin_pct || (latestDemand > 0 ? ((totalCapacity - latestDemand) / latestDemand) * 100 : 0);
  const eeaLevel = gridSummary?.eea_level || "Condition Green - Normal";
  const statusDesc = gridSummary?.status_description || "Spinning reserves optimal. System frequency 60.00 Hz stable.";

  // Custom User Alert Condition
  const isCustomAlertTriggered = reserveMarginPct < alertThreshold;

  // Fuel options with count
  const fuelTypes = ['All', 'Nuclear', 'Coal', 'Natural Gas', 'Hydroelectric', 'Solar'];

  // Filtered & Sorted Power Plants
  const filteredPlants = plants
    .filter(plant => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        plant.plant_name?.toLowerCase().includes(term) ||
        plant.fuel?.toLowerCase().includes(term) ||
        plant.state?.toLowerCase().includes(term)
      );
      const matchesFuel = selectedFuel === 'All' || plant.fuel?.toLowerCase().includes(selectedFuel.toLowerCase());
      return matchesSearch && matchesFuel;
    })
    .sort((a, b) => {
      if (sortBy === 'capacity-desc') return b.capacity_mw - a.capacity_mw;
      if (sortBy === 'capacity-asc') return a.capacity_mw - b.capacity_mw;
      if (sortBy === 'name-asc') return a.plant_name.localeCompare(b.plant_name);
      if (sortBy === 'state') return a.state.localeCompare(b.state);
      return 0;
    });

  const tablePadding = density === 'compact' ? 'py-1.5 text-xs' : 'py-2.5 text-sm';

  return (
    <div className="page-transition py-8 space-y-6">
      
      {/* Header with Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operator Telemetry Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Real-Time Grid Demand, Weather Telemetry & Power Plant Infrastructure
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Sync Status Pill */}
          <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200">
            <span className={`w-2 h-2 rounded-full ${refreshInterval > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span>{refreshInterval > 0 ? `Auto: ${refreshInterval}s` : 'Auto: Off'}</span>
            {lastUpdated && <span className="text-gray-400 text-[10px]">({lastUpdated})</span>}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchTelemetry(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            title="Fetch latest telemetry"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {/* Customize Preferences Toggle */}
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm transition ${
              showPreferences
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>⚙️</span>
            <span>Custom Settings</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CUSTOMIZATION PREFERENCES PANEL (EXPANDABLE) */}
      {/* ============================================================== */}
      {showPreferences && (
        <div className="border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-blue-200/60 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>🛠️</span> Operator Workspace Preferences
            </h3>
            <span className="text-[11px] text-gray-500">Settings save automatically to your browser</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Units Configuration */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase block">1. Display Units</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 block mb-1">Temperature:</span>
                  <div className="flex rounded-lg border overflow-hidden text-xs">
                    <button
                      onClick={() => setTempUnit('F')}
                      className={`flex-1 py-1 font-semibold ${tempUnit === 'F' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      °F
                    </button>
                    <button
                      onClick={() => setTempUnit('C')}
                      className={`flex-1 py-1 font-semibold ${tempUnit === 'C' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      °C
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 block mb-1">Power Scale:</span>
                  <div className="flex rounded-lg border overflow-hidden text-xs">
                    <button
                      onClick={() => setPowerUnit('MW')}
                      className={`flex-1 py-1 font-semibold ${powerUnit === 'MW' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      MW
                    </button>
                    <button
                      onClick={() => setPowerUnit('GW')}
                      className={`flex-1 py-1 font-semibold ${powerUnit === 'GW' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      GW
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Auto-Refresh Interval */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase block">2. Live Polling Frequency</label>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {[
                  { sec: 0, label: 'Off' },
                  { sec: 10, label: '10s' },
                  { sec: 30, label: '30s' },
                  { sec: 60, label: '60s' }
                ].map(opt => (
                  <button
                    key={opt.sec}
                    onClick={() => setRefreshInterval(opt.sec)}
                    className={`py-1.5 rounded font-semibold text-center border ${
                      refreshInterval === opt.sec
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-400 block">Queries TimescaleDB in background</span>
            </div>

            {/* 3. Safety Threshold Slider */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-600 uppercase">3. Reserve Alert Target</label>
                <span className="text-xs font-bold text-blue-600">{alertThreshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full accent-blue-600 h-1.5"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>10% (Low)</span>
                <span>25% (Standard)</span>
                <span>40% (Strict)</span>
              </div>
            </div>

            {/* 4. Table Density */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase block">4. Table Density</label>
              <div className="flex rounded-lg border overflow-hidden text-xs">
                <button
                  onClick={() => setDensity('comfortable')}
                  className={`flex-1 py-1.5 font-semibold ${density === 'comfortable' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  Comfortable
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`flex-1 py-1.5 font-semibold ${density === 'compact' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  Compact
                </button>
              </div>
              <span className="text-[10px] text-gray-400 block">Controls row padding & font size</span>
            </div>

          </div>
        </div>
      )}

      {/* User Custom Threshold Alert Warning Banner (if triggered) */}
      {isCustomAlertTriggered && (
        <div className="bg-amber-50 border-l-4 border-l-amber-500 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">⚠️</span>
            <span>
              <strong>Operator Threshold Warning:</strong> Reserve margin is currently at <strong>+{reserveMarginPct.toFixed(1)}%</strong>, which is below your custom target of <strong>{alertThreshold}%</strong>.
            </span>
          </div>
          <span className="font-semibold text-amber-700 uppercase tracking-wider text-[10px]">Alert Active</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border p-5 rounded-xl shadow-sm bg-white border-l-4 border-l-blue-500">
          <h3 className="text-xs font-semibold text-gray-400">CURRENT DUK DEMAND</h3>
          <p className="text-2xl font-bold mt-1 text-blue-600">{formatPower(latestDemand)}</p>
          <span className="text-xs text-gray-500">Balancing Authority: DUK</span>
        </div>

        <div className="border p-5 rounded-xl shadow-sm bg-white border-l-4 border-l-indigo-500">
          <h3 className="text-xs font-semibold text-gray-400">RECENT PEAK DEMAND</h3>
          <p className="text-2xl font-bold mt-1 text-indigo-600">{formatPower(peakDemand)}</p>
          <span className="text-xs text-gray-500">Max observed demand</span>
        </div>

        <div className="border p-5 rounded-xl shadow-sm bg-white border-l-4 border-l-amber-500">
          <h3 className="text-xs font-semibold text-gray-400">ENVIRONMENTAL TELEMETRY</h3>
          <p className="text-2xl font-bold mt-1 text-gray-800">{formatTemp(weather?.temperature_f)}</p>
          <span className="text-xs text-gray-500">Wind: {weather?.wind_speed_mph} mph | {weather?.location || 'SC'}</span>
        </div>

        <div className="border p-5 rounded-xl shadow-sm bg-white border-l-4 border-l-emerald-500">
          <h3 className="text-xs font-semibold text-gray-400">TRACKED GENERATION UNITS</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{plants.length > 0 ? `${plants.length} Facilities` : 'Active'}</p>
          <span className="text-xs text-gray-500">Carolinas Regional Facilities</span>
        </div>
      </div>

      {/* Operating Reserve Margin & Grid Strain Gauge Card */}
      <div className="border p-6 rounded-2xl shadow-sm bg-white border-l-4 border-l-emerald-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {eeaLevel}
              </span>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-semibold">
                Frequency: 60.00 Hz
              </span>
              <span className="text-xs text-gray-400">NERC Reliability Standard BAL-002</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Operating Reserve Margin & System Adequacy</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time available generation capacity cushion vs. metered Carolinas demand.
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-gray-400 font-semibold block uppercase">Operating Reserve Cushion</span>
            <span className="text-3xl font-extrabold text-emerald-600">
              +{formatPower(reserveCushion)}
            </span>
            <span className="text-xs text-gray-500 block">
              +{reserveMarginPct.toFixed(1)}% above current load
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-400 font-semibold uppercase">1. Available Generation Capacity</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatPower(totalCapacity)}</p>
            <p className="text-xs text-gray-500">25 tracked regional facilities</p>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase">2. Current System Demand</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatPower(latestDemand)}</p>
            <p className="text-xs text-blue-500">{utilizationPct.toFixed(1)}% total fleet utilization</p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-600 font-semibold uppercase">3. Spinning Reserve Cushion</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">+{formatPower(reserveCushion)}</p>
            <p className="text-xs text-emerald-600">Surplus dispatchable capacity</p>
          </div>
        </div>

        {/* Visual Multi-Zone Grid Strain Gauge Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-gray-600">Capacity Strain Gauge ({utilizationPct.toFixed(1)}% Engaged)</span>
            <span className="text-gray-400">Operating Reserve Buffer ({(100 - utilizationPct).toFixed(1)}% Free)</span>
          </div>

          <div className="relative w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner flex">
            {/* Shaded Capacity Fill */}
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(utilizationPct, 100)}%` }}
            ></div>
            {/* Surplus Free Buffer */}
            <div
              className="h-full bg-emerald-100/70 border-l border-emerald-300 flex-1 flex items-center justify-center text-[10px] font-bold text-emerald-800 tracking-wider"
            >
              SPINNING RESERVES
            </div>
          </div>

          {/* Scale Markings */}
          <div className="flex justify-between text-[11px] text-gray-400 pt-1">
            <span>0 {powerUnit}</span>
            <span className="text-blue-600 font-semibold">Current: {formatPower(latestDemand)}</span>
            <span className="text-indigo-600 font-semibold">Recent Peak: {formatPower(peakDemand)}</span>
            <span>Max Fleet: {formatPower(totalCapacity)}</span>
          </div>
        </div>

        {/* Operator Advisory & Fast-Start Readiness Banner */}
        <div className="bg-gray-50 border border-gray-200/80 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-emerald-500 font-bold text-base">✓</span>
            <span><strong>System Status:</strong> {statusDesc}</span>
          </div>
          <div className="text-gray-500 text-left sm:text-right">
            <span className="font-medium text-gray-700">Fast-Start Peakers:</span> Lincoln CT (1,200 MW) on Standby (&lt;15 min)
          </div>
        </div>
      </div>

      {/* Grid Layout for Telemetry & Infrastructure Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Table 1: Grid Demand Readings */}
        <div className="border p-6 rounded-xl shadow-sm bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Live DUK Demand Readings</h2>
            <span className="text-xs text-gray-400">Past 10 hourly intervals</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-gray-400 text-xs">
                  <th className={tablePadding}>Timestamp</th>
                  <th className={tablePadding}>Authority</th>
                  <th className={tablePadding}>Demand</th>
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                    <td className={`${tablePadding} text-gray-600`}>{new Date(row.time).toLocaleString()}</td>
                    <td className={tablePadding}>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                        {row.balancing_authority}
                      </span>
                    </td>
                    <td className={`${tablePadding} font-bold text-blue-600`}>
                      {formatPower(row.demand_mw)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Regional Generation Facilities with Multi-Filter & Search */}
        <div className="border p-6 rounded-xl shadow-sm bg-white space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Regional Power Plants (NC/SC)</h2>
              <span className="text-xs text-gray-400">
                Showing {filteredPlants.length} of {plants.length} facilities
              </span>
            </div>

            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search plant or fuel..."
                  className="w-full text-xs border border-gray-300 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="capacity-desc">Capacity (High-Low)</option>
                <option value="capacity-asc">Capacity (Low-High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="state">State (NC/SC)</option>
              </select>
            </div>
          </div>

          {/* Fuel Category Filter Chips */}
          <div className="flex flex-wrap gap-1.5 border-b pb-3">
            {fuelTypes.map(fuel => (
              <button
                key={fuel}
                onClick={() => setSelectedFuel(fuel)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition ${
                  selectedFuel === fuel
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {fuel}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-gray-400 text-xs">
                  <th className={tablePadding}>Facility Name</th>
                  <th className={tablePadding}>State</th>
                  <th className={tablePadding}>Primary Fuel</th>
                  <th className={tablePadding}>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.length > 0 ? (
                  filteredPlants.map((plant, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                      <td className={`${tablePadding} font-medium text-gray-800`}>{plant.plant_name}</td>
                      <td className={tablePadding}>
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {plant.state}
                        </span>
                      </td>
                      <td className={`${tablePadding} text-gray-600`}>{plant.fuel}</td>
                      <td className={`${tablePadding} font-bold text-emerald-600`}>
                        {formatPower(plant.capacity_mw)}
                      </td>
                    </tr>
                  ))
                ) : plants.length > 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500 text-sm">
                      No power plants matched the current filters.
                      <button
                        onClick={() => { setSearchTerm(''); setSelectedFuel('All'); }}
                        className="ml-2 text-blue-600 hover:underline text-xs"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-400">
                      No plant data populated yet. Run `python ingest.py` to ingest.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Operator;