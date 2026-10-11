import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_ACCOUNT = {
  account_number: "DUK-RES-8492041",
  name: "Alex Morgan",
  email: "alex.morgan@carolina.rr.com",
  phone: "(803) 555-0192",
  street: "1420 Main Street",
  city: "Columbia",
  state: "SC",
  zip_code: "29201",
  county: "Richland County",
  utility_provider: "Duke Energy Carolinas",
  home_size: "medium",
  custom_sqft: 2400,
  thermostat: 70,
  has_ev: true,
  ev_charger_type: "7.2",
  has_solar: false,
  solar_size_kw: 5.0,
  has_pool: false,
  has_appliances: true,
  custom_rate: 0.134,
  backup_power: "Generac 22kW Standby Generator",
  notifications_sms: true,
  notifications_email: true,
};

const PRESET_PROFILES = [
  {
    name: "Alex Morgan (Columbia, SC)",
    account: {
      ...DEFAULT_ACCOUNT,
      name: "Alex Morgan",
      city: "Columbia",
      state: "SC",
      county: "Richland County",
      home_size: "medium",
      custom_sqft: 2400,
      has_ev: true,
      ev_charger_type: "7.2",
      has_solar: false,
      backup_power: "Generac 22kW Standby Generator"
    }
  },
  {
    name: "Jordan Taylor (Charleston, SC)",
    account: {
      ...DEFAULT_ACCOUNT,
      account_number: "SCEG-RES-1049281",
      name: "Jordan Taylor",
      email: "jordan.taylor@chs.net",
      phone: "(843) 555-0144",
      street: "88 Broad Street",
      city: "Charleston",
      state: "SC",
      county: "Charleston County",
      utility_provider: "Dominion Energy SC",
      home_size: "small",
      custom_sqft: 1400,
      thermostat: 72,
      has_ev: false,
      has_solar: true,
      solar_size_kw: 6.5,
      has_pool: false,
      custom_rate: 0.142,
      backup_power: "Tesla Powerwall (13.5 kWh)"
    }
  },
  {
    name: "Sam Vance (Greenville, SC)",
    account: {
      ...DEFAULT_ACCOUNT,
      account_number: "DUK-RES-9938172",
      name: "Sam Vance",
      email: "sam.vance@upstate.org",
      phone: "(864) 555-0188",
      street: "320 Augusta Road",
      city: "Greenville",
      state: "SC",
      county: "Greenville County",
      utility_provider: "Duke Energy Carolinas",
      home_size: "large",
      custom_sqft: 3800,
      thermostat: 69,
      has_ev: true,
      ev_charger_type: "11.5",
      has_solar: true,
      solar_size_kw: 8.5,
      has_pool: true,
      custom_rate: 0.134,
      backup_power: "Kohler 30kW Liquid-Cooled Generator"
    }
  }
];

const Homeowner = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==================== Navigation Tabs ====================
  // 'weather' | 'consumption' | 'account' | 'all'
  const [activeTab, setActiveTab] = useState('weather');

  // ==================== Account Profile State ====================
  const [account, setAccount] = useState(() => {
    const saved = localStorage.getItem('gridpulse_homeowner_account');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ACCOUNT;
      }
    }
    return DEFAULT_ACCOUNT;
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ==================== Units ====================
  const [tempUnit, setTempUnit] = useState(() => localStorage.getItem('gp_ho_tempUnit') || 'F');

  // ==================== Active Consumption Estimator States ====================
  const [homeSize, setHomeSize] = useState(account.home_size || 'medium');
  const [thermostat, setThermostat] = useState(account.thermostat || 70);
  const [hasEv, setHasEv] = useState(account.has_ev ?? true);
  const [evChargerType, setEvChargerType] = useState(account.ev_charger_type || '7.2');
  const [hasAppliances, setHasAppliances] = useState(account.has_appliances ?? true);
  const [hasPool, setHasPool] = useState(account.has_pool ?? false);
  const [hasSolar, setHasSolar] = useState(account.has_solar ?? false);
  const [solarSizeKw, setSolarSizeKw] = useState(account.solar_size_kw || 5.0);
  const [customRate, setCustomRate] = useState(account.custom_rate || 0.134);
  const [useCustomRate, setUseCustomRate] = useState(true);

  // ==================== Checklist & NOAA Alert Filters ====================
  const [checklist, setChecklist] = useState({
    chargeDevices: true,
    flashlights: true,
    sealFreezer: false,
    generatorSafe: false,
    firstAid: true,
  });

  const [alertFilter, setAlertFilter] = useState('all');

  useEffect(() => {
    localStorage.setItem('gp_ho_tempUnit', tempUnit);
  }, [tempUnit]);

  // Fetch telemetry and account data from backend
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [telemetryRes, accountRes] = await Promise.allSettled([
          axios.get('http://127.0.0.1:8000/api/homeowner-data'),
          axios.get('http://127.0.0.1:8000/api/homeowner/account')
        ]);

        if (telemetryRes.status === 'fulfilled') {
          setData(telemetryRes.value.data);
        }

        // If backend returned account and no local changes override
        if (accountRes.status === 'fulfilled' && accountRes.value.data?.account) {
          const remoteAcc = accountRes.value.data.account;
          // Sync with local state if local was default
          if (!localStorage.getItem('gridpulse_homeowner_account')) {
            setAccount(remoteAcc);
            syncAccountToEstimator(remoteAcc);
          }
        }
      } catch (err) {
        console.error("Error fetching homeowner data:", err);
        setError("Unable to connect to live grid telemetry. Ensure the backend server is running.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const syncAccountToEstimator = (acc) => {
    setHomeSize(acc.home_size || 'medium');
    setThermostat(acc.thermostat || 70);
    setHasEv(acc.has_ev ?? false);
    setEvChargerType(acc.ev_charger_type || '7.2');
    setHasAppliances(acc.has_appliances ?? true);
    setHasPool(acc.has_pool ?? false);
    setHasSolar(acc.has_solar ?? false);
    setSolarSizeKw(acc.solar_size_kw || 5.0);
    setCustomRate(acc.custom_rate || 0.134);
  };

  const handleSaveAccount = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);

    // Merge current estimator state into account object
    const updatedAccount = {
      ...account,
      home_size: homeSize,
      thermostat: thermostat,
      has_ev: hasEv,
      ev_charger_type: evChargerType,
      has_appliances: hasAppliances,
      has_pool: hasPool,
      has_solar: hasSolar,
      solar_size_kw: solarSizeKw,
      custom_rate: customRate,
    };

    setAccount(updatedAccount);
    localStorage.setItem('gridpulse_homeowner_account', JSON.stringify(updatedAccount));

    try {
      await axios.post('http://127.0.0.1:8000/api/homeowner/account', updatedAccount);
    } catch (err) {
      console.warn("Backend save failed, saved locally in browser:", err);
    } finally {
      setIsSaving(false);
      setSaveSuccessMsg("Account profile & home settings saved successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleApplyPreset = (presetAccount) => {
    setAccount(presetAccount);
    syncAccountToEstimator(presetAccount);
    localStorage.setItem('gridpulse_homeowner_account', JSON.stringify(presetAccount));
    setSaveSuccessMsg(`Loaded preset profile for ${presetAccount.name}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ---------------- Temperature Formatter ----------------
  const formatTemp = (tempF) => {
    if (tempF === null || tempF === undefined) return 'N/A';
    if (tempUnit === 'C') {
      return `${Math.round((tempF - 32) * 5 / 9)}°C`;
    }
    return `${tempF}°F`;
  };

  // ---------------- Energy Estimator Calculations ----------------
  const baseSizeKw = {
    small: 1.1,
    medium: 2.1,
    large: 3.4,
  }[homeSize] || 2.1;

  const outdoorTemp = data?.weather?.temperature_f ?? 72;
  const tempDelta = Math.abs(outdoorTemp - thermostat);
  const hvacKw = Number((tempDelta * 0.12).toFixed(2));

  const evKw = hasEv ? Number(evChargerType) : 0;
  const appliancesKw = hasAppliances ? 2.4 : 0;
  const poolKw = hasPool ? 1.5 : 0;
  const solarOffsetKw = hasSolar ? Number(solarSizeKw) : 0;

  const grossDrawKw = Number((baseSizeKw + hvacKw + evKw + appliancesKw + poolKw).toFixed(2));
  const netDrawKw = Number(Math.max(grossDrawKw - solarOffsetKw, 0.2).toFixed(2));

  const estimatedDailyKwh = Number((netDrawKw * 14.5).toFixed(1));
  const activeRate = useCustomRate ? Number(customRate) : (data?.pricing?.avg_rate_kwh || 0.134);
  const estimatedMonthlyBill = Number((estimatedDailyKwh * 30 * activeRate).toFixed(2));
  const monthlySolarSavings = hasSolar ? Number((solarOffsetKw * 5 * 30 * activeRate).toFixed(2)) : 0;

  // ---------------- Storm Risk Helpers ----------------
  const risk = data?.storm_risk || { score: 25, level: 'Low', advisory: 'Conditions normal.', factors: [] };
  
  const getRiskColor = (level) => {
    switch (level) {
      case 'Severe':
        return { badge: 'bg-red-100 text-red-800 border-red-300', bar: 'bg-red-500', border: 'border-l-red-500' };
      case 'High':
        return { badge: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-500', border: 'border-l-orange-500' };
      case 'Moderate':
        return { badge: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500', border: 'border-l-amber-500' };
      default:
        return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500', border: 'border-l-emerald-500' };
    }
  };

  const riskTheme = getRiskColor(risk.level);

  const rawAlerts = data?.alerts || [];
  const filteredAlerts = rawAlerts.filter(a => {
    if (alertFilter === 'severe') return a.severity === 'Severe' || a.severity === 'Extreme';
    if (alertFilter === 'sc') return a.areaDesc?.includes('SC') || a.headline?.includes('SC');
    if (alertFilter === 'nc') return a.areaDesc?.includes('NC') || a.headline?.includes('NC');
    return true;
  });

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-gray-500">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-base font-medium">Loading live storm risk & home telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
          <h2 className="font-bold text-lg mb-1">Telemetry Offline</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner with Account Quick-Info & Temperature Unit */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Homeowner Grid & Storm Resilience Hub</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="font-medium text-gray-800">👤 {account.name}</span>
            <span>•</span>
            <span>📍 {account.street}, {account.city}, {account.state}</span>
            <span>•</span>
            <span className="font-mono text-blue-600 font-semibold">{account.account_number}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Temperature Unit Customizer */}
          <div className="flex rounded-lg border overflow-hidden text-xs bg-white shadow-2xs">
            <button
              onClick={() => setTempUnit('F')}
              className={`px-3 py-1 font-semibold transition ${tempUnit === 'F' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              °F
            </button>
            <button
              onClick={() => setTempUnit('C')}
              className={`px-3 py-1 font-semibold transition ${tempUnit === 'C' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              °C
            </button>
          </div>

          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200">
            Utility: {account.utility_provider || 'Duke Energy'}
          </span>
        </div>
      </div>

      {/* Save Success Alert Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold text-base">✓</span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION TABS: WEATHER VS. CONSUMPTION VS. ACCOUNT */}
      {/* ============================================================== */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('weather')}
          className={`flex items-center gap-2 py-3.5 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'weather'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <span>⛈️</span>
          <span>Weather & Storm Risk</span>
          {rawAlerts.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {rawAlerts.length} Alerts
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('consumption')}
          className={`flex items-center gap-2 py-3.5 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'consumption'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <span>⚡</span>
          <span>Power Consumption & Billing</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
            {netDrawKw} kW
          </span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 py-3.5 px-6 text-sm font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'account'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <span>👤</span>
          <span>My Account & Home Profile</span>
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-semibold">
            Saved
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`hidden md:flex items-center gap-2 py-3.5 px-5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600 bg-blue-50/40'
              : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>📋</span>
          <span>View All</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: WEATHER & STORM RISK CONTENT */}
      {/* ============================================================== */}
      {(activeTab === 'weather' || activeTab === 'all') && (
        <div className="space-y-6">
          
          {/* Section 1: Storm & Outage Scorecard */}
          <div className={`border p-6 rounded-2xl shadow-sm bg-white border-l-8 ${riskTheme.border}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${riskTheme.badge}`}>
                    {risk.level} Outage Risk
                  </span>
                  <span className="text-xs text-gray-400">
                    Live telemetry for {account.city}, {account.state} ({account.county})
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Storm Impact & Outage Probability: {risk.score}/100
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {risk.advisory}
                </p>
              </div>

              {/* Mini Telemetry Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">SURFACE TEMP</p>
                  <p className="text-lg font-bold text-gray-800">{formatTemp(data?.weather?.temperature_f)}</p>
                  <span className="text-xs text-gray-500">{data?.weather?.condition_text}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">WIND SPEED</p>
                  <p className="text-lg font-bold text-gray-800">{data?.weather?.wind_speed_mph} mph</p>
                  <span className="text-xs text-gray-500">Tree hazard factor</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">GRID DEMAND</p>
                  <p className="text-lg font-bold text-blue-600">{data?.grid?.demand_mw?.toLocaleString()} MW</p>
                  <span className="text-xs text-gray-500">{data?.grid?.grid_status}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">ACTIVE ALERTS</p>
                  <p className="text-lg font-bold text-amber-600">{rawAlerts.length}</p>
                  <span className="text-xs text-gray-500">NOAA warnings</span>
                </div>
              </div>
            </div>

            {/* Risk Progress Bar */}
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${riskTheme.bar}`}
                  style={{ width: `${risk.score}%` }}
                ></div>
              </div>
            </div>

            {/* Contributing Risk Factors & Emergency Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>⚠️</span> Telemetry Risk Factors Detected
                </h3>
                <ul className="space-y-2 text-xs text-gray-600">
                  {risk.factors?.length > 0 ? (
                    risk.factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{factor}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">No adverse weather factors detected.</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🛡️</span> Outage Preparation Checklist ({account.name}'s Home)
                </h3>
                <div className="space-y-2 text-xs text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.chargeDevices}
                      onChange={() => toggleChecklist('chargeDevices')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className={checklist.chargeDevices ? "line-through text-gray-400" : ""}>
                      Charge smartphones & portable power banks
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.flashlights}
                      onChange={() => toggleChecklist('flashlights')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className={checklist.flashlights ? "line-through text-gray-400" : ""}>
                      Emergency flashlights & extra batteries ready
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.sealFreezer}
                      onChange={() => toggleChecklist('sealFreezer')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className={checklist.sealFreezer ? "line-through text-gray-400" : ""}>
                      Keep refrigerator and freezer closed to preserve food
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.generatorSafe}
                      onChange={() => toggleChecklist('generatorSafe')}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className={checklist.generatorSafe ? "line-through text-gray-400" : ""}>
                      Safe backup power: {account.backup_power || 'Generator outdoors 20+ ft away'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Live NOAA Storm Warnings */}
          <div className="border p-6 rounded-2xl shadow-sm bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🌪️</span> Live National Weather Service Storm Warnings
                </h2>
                <p className="text-xs text-gray-400">
                  Active severe storm, flood, and high-wind advisories in North & South Carolina
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `All (${rawAlerts.length})` },
                  { id: 'sc', label: 'South Carolina' },
                  { id: 'nc', label: 'North Carolina' },
                  { id: 'severe', label: 'Severe Only' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAlertFilter(tab.id)}
                    className={`text-xs px-3 py-1 rounded-lg border font-medium transition ${
                      alertFilter === tab.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                {filteredAlerts.map((alert, idx) => {
                  const isSevere = alert.severity === 'Severe' || alert.severity === 'Extreme';
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-sm space-y-2 ${
                        isSevere ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isSevere ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {alert.event}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">{alert.severity}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-2">
                        {alert.headline}
                      </h4>
                      {alert.areaDesc && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          <span className="font-medium text-gray-700">Affected Areas:</span> {alert.areaDesc}
                        </p>
                      )}
                      {alert.instruction && (
                        <div className="text-xs bg-white/70 p-2.5 rounded border border-gray-200/80 text-gray-700 line-clamp-3">
                          <span className="font-semibold text-gray-900 block mb-1">Safety Instruction:</span>
                          {alert.instruction}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">
                No active storm warnings match your filter.
              </div>
            )}
          </div>

          {/* Outage Reporting Quick Contacts */}
          <div className="border p-5 rounded-2xl shadow-sm bg-white">
            <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <span>📞</span> Emergency Utility Outage Hotlines
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border flex flex-col justify-between">
                <span className="text-gray-600 font-medium">Duke Energy Carolinas</span>
                <a href="tel:18007693766" className="font-bold text-blue-600 text-sm mt-1 hover:underline">1-800-POWERON</a>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border flex flex-col justify-between">
                <span className="text-gray-600 font-medium">Santee Cooper</span>
                <a href="tel:18887697620" className="font-bold text-blue-600 text-sm mt-1 hover:underline">1-888-769-7620</a>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border flex flex-col justify-between">
                <span className="text-gray-600 font-medium">Dominion Energy SC</span>
                <a href="tel:18883334465" className="font-bold text-blue-600 text-sm mt-1 hover:underline">1-888-333-4465</a>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: POWER CONSUMPTION & BILLING CONTENT */}
      {/* ============================================================== */}
      {(activeTab === 'consumption' || activeTab === 'all') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Interactive Input Controls (7 cols) */}
          <div className="lg:col-span-7 border p-6 rounded-2xl shadow-sm bg-white space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>⚡</span> Home Power Consumption Estimator
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Connected to profile: <strong className="text-gray-700">{account.name}</strong> ({account.city}, {account.state})
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAccount}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <span>💾</span>
                <span>{isSaving ? "Saving..." : "Save to Account"}</span>
              </button>
            </div>

            {/* 1. Home Size Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2 uppercase">1. Residence Square Footage</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'small', label: 'Apartment / Small', sqft: '~1,200 sq ft' },
                  { id: 'medium', label: 'Single Family', sqft: '~2,400 sq ft' },
                  { id: 'large', label: 'Large Home', sqft: '~3,600+ sq ft' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHomeSize(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      homeSize === opt.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <p className="text-xs">{opt.label}</p>
                    <p className="text-xs text-gray-400 font-normal">{opt.sqft}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. HVAC & Thermostat */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase">
                  2. Thermostat Setpoint ({formatTemp(thermostat)})
                </label>
                <span className="text-xs text-gray-500">
                  Outdoor: {formatTemp(outdoorTemp)} ({outdoorTemp > thermostat ? 'AC Cooling' : 'Heating'})
                </span>
              </div>
              <input
                type="range"
                min="65"
                max="78"
                value={thermostat}
                onChange={(e) => setThermostat(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTemp(65)} (Cold)</span>
                <span>{formatTemp(72)} (Balanced)</span>
                <span>{formatTemp(78)} (Eco)</span>
              </div>
            </div>

            {/* 3. Major Appliances Toggles & Custom Equipment Speeds */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500 block uppercase">
                3. Active Equipment & High-Draw Appliances
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* EV Charging with Charger Speed Customizer */}
                <div className={`p-3 rounded-xl border space-y-2 ${hasEv ? 'border-indigo-600 bg-indigo-50/60' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">🚗 Electric Vehicle Charger</p>
                      <p className="text-xs text-gray-400">+{evKw} kW charging rate</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasEv(!hasEv)}
                      className={`text-xs px-2 py-0.5 rounded font-bold ${hasEv ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {hasEv ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {hasEv && (
                    <div className="pt-2 border-t border-indigo-200/60 flex gap-1.5 text-[10px]">
                      {[
                        { val: '1.4', label: '1.4 kW (L1)' },
                        { val: '7.2', label: '7.2 kW (L2)' },
                        { val: '11.5', label: '11.5 kW (Fast)' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setEvChargerType(opt.val)}
                          className={`flex-1 py-1 rounded border font-semibold ${
                            evChargerType === opt.val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Laundry & Oven */}
                <button
                  type="button"
                  onClick={() => setHasAppliances(!hasAppliances)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                    hasAppliances ? 'border-amber-600 bg-amber-50/60' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-800">🧺 Laundry & Oven Running</p>
                    <p className="text-xs text-gray-400">+2.4 kW resistive load</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${hasAppliances ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {hasAppliances ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Pool Pump */}
                <button
                  type="button"
                  onClick={() => setHasPool(!hasPool)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                    hasPool ? 'border-cyan-600 bg-cyan-50/60' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-800">🏊 Swimming Pool Pump</p>
                    <p className="text-xs text-gray-400">+1.5 kW motor load</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${hasPool ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {hasPool ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Rooftop Solar with Array Capacity Slider */}
                <div className={`p-3 rounded-xl border space-y-2 ${hasSolar ? 'border-emerald-600 bg-emerald-50/60' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">☀️ Rooftop Solar Panels</p>
                      <p className="text-xs text-gray-400">-{solarOffsetKw} kW offset</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasSolar(!hasSolar)}
                      className={`text-xs px-2 py-0.5 rounded font-bold ${hasSolar ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {hasSolar ? 'ACTIVE' : 'NONE'}
                    </button>
                  </div>
                  {hasSolar && (
                    <div className="pt-2 border-t border-emerald-200/60 space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-600">
                        <span>Solar Array Capacity:</span>
                        <span className="font-bold text-emerald-700">{solarSizeKw} kW</span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="10.0"
                        step="0.5"
                        value={solarSizeKw}
                        onChange={(e) => setSolarSizeKw(Number(e.target.value))}
                        className="w-full accent-emerald-600 h-1"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* 4. Utility Electricity Rate Customizer */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-700 uppercase">
                  4. Utility Electricity Rate ($/kWh)
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomRate(!useCustomRate)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    useCustomRate ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {useCustomRate ? 'Custom Rate Active' : 'Use Duke Avg ($0.134)'}
                </button>
              </div>
              {useCustomRate ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-600">$</span>
                  <input
                    type="number"
                    step="0.005"
                    min="0.05"
                    max="0.40"
                    value={customRate}
                    onChange={(e) => setCustomRate(Number(e.target.value))}
                    className="w-32 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <span className="text-xs text-gray-500">per kWh (Check your electric bill)</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Calculations currently use Duke Energy Carolinas standard residential rate: <strong>$0.134 / kWh</strong>.
                </p>
              )}
            </div>
          </div>

          {/* Right: Calculated Consumption & Bill Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Main Calculation Card */}
            <div className="border p-6 rounded-2xl shadow-sm bg-gradient-to-br from-blue-900 to-indigo-950 text-white">
              <h3 className="text-xs font-semibold text-blue-200 tracking-wider uppercase mb-1">
                CURRENT ESTIMATED DRAW
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-extrabold">{netDrawKw}</span>
                <span className="text-lg font-medium text-blue-200">kW</span>
                {hasSolar && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded ml-auto">
                    Solar Offset Active
                  </span>
                )}
              </div>

              <div className="border-t border-blue-800/80 pt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-200">Daily Energy Consumption:</span>
                  <span className="font-bold text-white">{estimatedDailyKwh} kWh / day</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-200">Est. Monthly Electricity Bill:</span>
                  <span className="text-xl font-bold text-emerald-400">${estimatedMonthlyBill}</span>
                </div>
                {hasSolar && (
                  <div className="flex justify-between items-center text-xs text-emerald-300">
                    <span>Estimated Solar Savings:</span>
                    <span>-${monthlySolarSavings} / month</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-blue-800/60 text-xs text-blue-300/80">
                Active Billing Rate: <strong className="text-white">${activeRate.toFixed(3)}/kWh</strong>
              </div>
            </div>

            {/* Time of Use Tip Card */}
            <div className="border p-5 rounded-2xl shadow-sm bg-white border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🕒</span>
                <h4 className="font-semibold text-gray-900 text-sm">Off-Peak Window Savings</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Duke Energy off-peak hours are <strong>{data?.pricing?.off_peak_hours || '9 PM - 6 AM'}</strong>. 
                Running your dishwasher, dryer, and EV charging overnight can save approximately 
                <strong className="text-emerald-600"> 25–30%</strong> on time-of-use electric rates.
              </p>
            </div>

            {/* Outage Reporting Contacts */}
            <div className="border p-5 rounded-2xl shadow-sm bg-white">
              <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <span>📞</span> Local Utility Outage Hotlines
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-gray-600">Duke Energy Carolinas</span>
                  <a href="tel:18007693766" className="font-bold text-blue-600 hover:underline">1-800-POWERON</a>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-gray-600">Santee Cooper</span>
                  <a href="tel:18887697620" className="font-bold text-blue-600 hover:underline">1-888-769-7620</a>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Dominion Energy SC</span>
                  <a href="tel:18883334465" className="font-bold text-blue-600 hover:underline">1-888-333-4465</a>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MY ACCOUNT & SAVED HOME PROFILE */}
      {/* ============================================================== */}
      {(activeTab === 'account' || activeTab === 'all') && (
        <div className="space-y-6">
          
          {/* Preset Profile Switcher Bar */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-gray-700 block uppercase">Demo Persona Switcher</span>
              <span className="text-xs text-gray-400">Load pre-configured homeowner accounts across the Carolinas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROFILES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.account)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                    account.name === preset.account.name
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveAccount} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 8 Cols: Editable Account & Residence Details */}
            <div className="lg:col-span-8 border p-6 rounded-2xl shadow-sm bg-white space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>👤</span> Account & Property Settings
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Update your home dimensions, location, and backup equipment to personalize your storm risk & consumption models.
                </p>
              </div>

              {/* 1. Account Holder & Location Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">
                  1. Service Address & Utility Details
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={account.name}
                      onChange={(e) => setAccount({ ...account, name: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Utility Account Number</label>
                    <input
                      type="text"
                      value={account.account_number}
                      onChange={(e) => setAccount({ ...account, account_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 text-gray-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={account.email}
                      onChange={(e) => setAccount({ ...account, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">SMS Alert Phone Number</label>
                    <input
                      type="text"
                      value={account.phone}
                      onChange={(e) => setAccount({ ...account, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-semibold text-gray-700 block mb-1">Street Address</label>
                    <input
                      type="text"
                      value={account.street}
                      onChange={(e) => setAccount({ ...account, street: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={account.city}
                      onChange={(e) => setAccount({ ...account, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">State</label>
                      <select
                        value={account.state}
                        onChange={(e) => setAccount({ ...account, state: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                      >
                        <option value="SC">SC (South Carolina)</option>
                        <option value="NC">NC (North Carolina)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={account.zip_code}
                        onChange={(e) => setAccount({ ...account, zip_code: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">County / Jurisdiction</label>
                    <input
                      type="text"
                      value={account.county}
                      onChange={(e) => setAccount({ ...account, county: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Electric Utility Provider</label>
                    <select
                      value={account.utility_provider}
                      onChange={(e) => setAccount({ ...account, utility_provider: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                    >
                      <option value="Duke Energy Carolinas">Duke Energy Carolinas</option>
                      <option value="Duke Energy Progress">Duke Energy Progress</option>
                      <option value="Santee Cooper">Santee Cooper</option>
                      <option value="Dominion Energy SC">Dominion Energy SC</option>
                      <option value="Electric Cooperative">Local Electric Co-op</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Residence & Hardware Specs */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">
                  2. Home Dimensions & Backup Power
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Residence Category</label>
                    <select
                      value={homeSize}
                      onChange={(e) => setHomeSize(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                    >
                      <option value="small">Apartment / Small (~1,200 sq ft)</option>
                      <option value="medium">Single Family Home (~2,400 sq ft)</option>
                      <option value="large">Large Residence (~3,600+ sq ft)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Backup Generator / Battery System</label>
                    <select
                      value={account.backup_power}
                      onChange={(e) => setAccount({ ...account, backup_power: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                    >
                      <option value="Generac 22kW Standby Generator">Generac 22kW Standby Generator</option>
                      <option value="Tesla Powerwall (13.5 kWh)">Tesla Powerwall (13.5 kWh Storage)</option>
                      <option value="Kohler 30kW Liquid-Cooled Generator">Kohler 30kW Liquid-Cooled</option>
                      <option value="Portable 7,500W Gas Generator">Portable 7,500W Gas Generator</option>
                      <option value="None">None (Grid Dependent)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Installed Solar Capacity</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasSolar}
                        onChange={(e) => setHasSolar(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span className="text-gray-600">Rooftop Solar Active</span>
                      {hasSolar && (
                        <span className="font-bold text-emerald-700 ml-auto">{solarSizeKw} kW</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Electric Vehicle Charger</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasEv}
                        onChange={(e) => setHasEv(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-gray-600">EV Station Installed</span>
                      {hasEv && (
                        <span className="font-bold text-indigo-700 ml-auto">{evChargerType} kW</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Notification Preferences */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-1">
                  3. Emergency Outage & Storm Alerts
                </h3>
                
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={account.notifications_sms ?? true}
                      onChange={(e) => setAccount({ ...account, notifications_sms: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Send urgent SMS alerts to <strong>{account.phone}</strong> when local storm risk is Severe
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={account.notifications_email ?? true}
                      onChange={(e) => setAccount({ ...account, notifications_email: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Send daily energy saving tips & off-peak schedules to <strong>{account.email}</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm transition flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{isSaving ? "Saving Account Settings..." : "Save Account Settings"}</span>
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Account Overview Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="border p-6 rounded-2xl shadow-sm bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-700/80 pb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold">
                    {account.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{account.name}</h3>
                    <p className="text-xs text-blue-300">{account.utility_provider}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{account.account_number}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Service Location:</span>
                    <span className="font-medium text-slate-100">{account.street}</span>
                    <span className="block text-slate-300">{account.city}, {account.state} {account.zip_code}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Residence Configuration:</span>
                    <span className="font-medium text-slate-100 capitalize">{homeSize} residence</span>
                    <span className="block text-slate-300">Thermostat setpoint: {formatTemp(thermostat)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Equipment Active:</span>
                    <ul className="text-slate-300 space-y-1 mt-1 text-[11px]">
                      {hasEv && <li>🚗 EV Charger ({evChargerType} kW)</li>}
                      {hasSolar && <li>☀️ Rooftop Solar ({solarSizeKw} kW Array)</li>}
                      {hasPool && <li>🏊 Pool Pump (+1.5 kW)</li>}
                      <li>🛡️ {account.backup_power}</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-700/80 pt-3 flex justify-between text-xs">
                  <span className="text-slate-400">Account Status:</span>
                  <span className="text-emerald-400 font-bold">● Active Customer</span>
                </div>
              </div>

              {/* Quick Sync Button */}
              <div className="border p-5 rounded-2xl shadow-sm bg-white">
                <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Sync Profile</h4>
                <p className="text-xs text-gray-500 mb-3">
                  All adjustments made in your account profile automatically configure the interactive Consumption Estimator.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    syncAccountToEstimator(account);
                    setActiveTab('consumption');
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2 rounded-lg border transition"
                >
                  ⚡ View in Consumption Estimator →
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};

export default Homeowner;