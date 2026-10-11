import os 
import time
import requests
import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

WMO_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

_nws_cache = {"timestamp": 0, "data": []}

def fetch_nws_alerts():
    now = time.time()
    if now - _nws_cache["timestamp"] < 300 and _nws_cache["data"]:
        return _nws_cache["data"]
    try:
        url = "https://api.weather.gov/alerts/active?area=SC,NC"
        resp = requests.get(url, headers={"User-Agent": "GridPulseApp/1.0 (contact@gridpulse.io)"}, timeout=4.0)
        if resp.status_code == 200:
            features = resp.json().get("features", [])
            alerts = []
            for f in features[:15]:
                p = f.get("properties", {})
                alerts.append({
                    "id": p.get("id"),
                    "event": p.get("event", "Storm Advisory"),
                    "headline": p.get("headline", ""),
                    "severity": p.get("severity", "Unknown"),
                    "urgency": p.get("urgency", ""),
                    "areaDesc": p.get("areaDesc", ""),
                    "instruction": p.get("instruction") or p.get("description", "")[:250]
                })
            _nws_cache["timestamp"] = now
            _nws_cache["data"] = alerts
            return alerts
    except Exception as e:
        print(f"Error fetching NWS alerts: {e}")
    return _nws_cache.get("data", [])

app = FastAPI(title="GridPulse API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Database_url = os.getenv("DATABASE_URL", "postgres://tsdbadmin:tsluz0dw71gn99a8@j8p7qsilr0.ab056sk5fy.tsdb.cloud.timescale.com:32721/tsdb?sslmode=require")

def get_db_connection():
    return psycopg2.connect(Database_url)

@app.get("/")
def home():
    return {"status": "GridPulse API is running"}

@app.get("/api/grid-data")
def get_grid_data(limit: int=24):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT time, balancing_authority, demand_mw
            FROM public_grid_readings
            WHERE balancing_authority = 'DUK'
            ORDER BY time DESC
            LIMIT %s;
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        data = [
            {"time": row[0].isoformat(), "balancing_authority" : row[1], "demand_mw": float(row[2])}
            for row in rows
        ]

        # Calculate Operating Reserve Margin & System Adequacy
        cursor.execute("SELECT COALESCE(SUM(capacity_mw), 25838.0) FROM power_plants;")
        cap_row = cursor.fetchone()
        total_capacity = float(cap_row[0]) if cap_row and cap_row[0] else 25838.0

        latest_demand = data[0]["demand_mw"] if data else 8900.0
        peak_demand = max([d["demand_mw"] for d in data]) if data else latest_demand

        reserve_cushion_mw = max(total_capacity - latest_demand, 0.0)
        utilization_pct = round((latest_demand / total_capacity * 100), 1) if total_capacity > 0 else 0.0
        reserve_margin_pct = round(((total_capacity - latest_demand) / latest_demand * 100), 1) if latest_demand > 0 else 0.0

        # NERC Energy Emergency Alert (EEA) Standards
        if utilization_pct >= 95:
            eea_level = "EEA 3 - Firm Load Shedding"
            status_desc = "Emergency protocols active. Critical generation shortfall."
            alert_color = "red"
        elif utilization_pct >= 85:
            eea_level = "EEA 2 - High Grid Strain"
            status_desc = "Public conservation & industrial demand response engaged."
            alert_color = "orange"
        elif utilization_pct >= 75:
            eea_level = "EEA 1 - Operational Advisory"
            status_desc = "All available generating reserves committed."
            alert_color = "amber"
        else:
            eea_level = "Condition Green - Normal"
            status_desc = "Spinning reserves optimal. System frequency 60.00 Hz stable."
            alert_color = "emerald"

        summary = {
            "total_capacity_mw": total_capacity,
            "latest_demand_mw": latest_demand,
            "peak_demand_mw": peak_demand,
            "reserve_cushion_mw": reserve_cushion_mw,
            "utilization_pct": utilization_pct,
            "reserve_margin_pct": reserve_margin_pct,
            "eea_level": eea_level,
            "status_description": status_desc,
            "alert_color": alert_color
        }

        return {"data": data, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/api/weather-data")
def get_weather_data(limit: int = 10):
    """Fetches the latest weather readings for South Carolina"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT time, location_name, temperature_f, wind_speed_mph, condition_code 
            FROM weather_readings 
            ORDER BY time DESC 
            LIMIT %s;
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        data = [
            {
                "time": row[0].isoformat(),
                "location": row[1],
                "temperature_f": float(row[2]) if row[2] is not None else None,
                "wind_speed_mph": float(row[3]) if row[3] is not None else None,
                "condition_code": row[4]
            }
            for row in rows
        ]
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/plants-data")
def get_plants_data(limit: int = 50):
    """Fetches power generation facilities in NC & SC"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT plant_id, plant_name, state, primary_fuel, capacity_mw 
            FROM power_plants 
            ORDER BY capacity_mw DESC 
            LIMIT %s;
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        data = [
            {
                "plant_id": row[0],
                "plant_name": row[1],
                "state": row[2],
                "fuel": row[3],
                "capacity_mw": float(row[4]) if row[4] else 0.0
            }
            for row in rows
        ]
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/homeowner-data")
def get_homeowner_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Fetch latest weather reading
        cursor.execute("""
            SELECT time, location_name, temperature_f, wind_speed_mph, condition_code
            FROM weather_readings
            ORDER BY time DESC
            LIMIT 1;
        """)
        weather_row = cursor.fetchone()
        weather = None
        temp_f = 72.0
        wind_mph = 8.0
        cond_code = 0
        if weather_row:
            temp_f = float(weather_row[2]) if weather_row[2] is not None else 72.0
            wind_mph = float(weather_row[3]) if weather_row[3] is not None else 8.0
            cond_code = weather_row[4] or 0
            weather = {
                "time": weather_row[0].isoformat(),
                "location": weather_row[1],
                "temperature_f": temp_f,
                "wind_speed_mph": wind_mph,
                "condition_code": cond_code,
                "condition_text": WMO_DESCRIPTIONS.get(cond_code, "Partly Cloudy")
            }

        # 2. Fetch latest grid demand reading
        cursor.execute("""
            SELECT time, balancing_authority, demand_mw
            FROM public_grid_readings
            WHERE balancing_authority = 'DUK'
            ORDER BY time DESC
            LIMIT 1;
        """)
        grid_row = cursor.fetchone()
        demand_mw = float(grid_row[2]) if grid_row and grid_row[2] is not None else 8500.0
        grid_info = {
            "time": grid_row[0].isoformat() if grid_row else None,
            "balancing_authority": grid_row[1] if grid_row else "DUK",
            "demand_mw": demand_mw,
            "grid_status": "High Demand" if demand_mw > 9500 else ("Moderate Demand" if demand_mw > 8000 else "Normal")
        }

        # 3. Fetch active NWS storm alerts
        alerts = fetch_nws_alerts()

        # 4. Calculate Storm & Outage Risk Score (0 - 100)
        risk_score = 15
        risk_factors = []

        if wind_mph >= 40:
            risk_score += 45
            risk_factors.append(f"High wind speeds ({wind_mph} mph) exceed tree-trimming resilience thresholds.")
        elif wind_mph >= 25:
            risk_score += 25
            risk_factors.append(f"Moderate wind gusts ({wind_mph} mph) observed in regional telemetry.")
        else:
            risk_factors.append(f"Calm local surface winds ({wind_mph} mph).")

        if cond_code in [95, 96, 99]:
            risk_score += 30
            risk_factors.append("Active thunderstorm / lightning activity detected in weather sensors.")
        elif cond_code in [65, 67, 82]:
            risk_score += 20
            risk_factors.append("Heavy torrential rainfall or freezing precipitation in progress.")
        elif cond_code in [51, 53, 55, 61, 63, 80, 81]:
            risk_score += 10
            risk_factors.append("Light to moderate precipitation across regional distribution network.")

        has_severe_alert = any(a.get("severity") in ["Severe", "Extreme"] for a in alerts)
        has_moderate_alert = any(a.get("severity") == "Moderate" for a in alerts)
        if has_severe_alert:
            risk_score += 25
            risk_factors.append(f"{len(alerts)} active NOAA / NWS severe weather alerts in the Carolinas.")
        elif has_moderate_alert:
            risk_score += 15
            risk_factors.append(f"{len(alerts)} NOAA / NWS weather advisories currently active.")

        if demand_mw > 9600:
            risk_score += 15
            risk_factors.append(f"Regional grid operating at peak demand ({demand_mw:,.0f} MW).")

        risk_score = min(max(risk_score, 10), 100)

        if risk_score >= 75:
            risk_level = "Severe"
            advisory = "Severe weather/storm conditions imminent. Keep mobile phones charged, have flashlights ready, and monitor backup supplies."
        elif risk_score >= 50:
            risk_level = "High"
            advisory = "Elevated storm activity. Isolated line disruptions and downed branches possible in vulnerable sectors."
        elif risk_score >= 30:
            risk_level = "Moderate"
            advisory = "Minor weather activity. Grid operating stably, but localized gusts could trigger brief voltage flickers."
        else:
            risk_level = "Low"
            advisory = "Weather is calm and grid capacity is stable. Minimal outage probability."

        return {
            "weather": weather,
            "grid": grid_info,
            "storm_risk": {
                "score": risk_score,
                "level": risk_level,
                "advisory": advisory,
                "factors": risk_factors
            },
            "alerts": alerts,
            "pricing": {
                "avg_rate_kwh": 0.134,
                "off_peak_hours": "9:00 PM - 6:00 AM",
                "on_peak_hours": "2:00 PM - 7:00 PM",
                "rate_provider": "Duke Energy Carolinas (Residential)"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# In-memory Mock Homeowner Account Store
_mock_homeowner_account = {
    "account_number": "DUK-RES-8492041",
    "name": "Alex Morgan",
    "email": "alex.morgan@carolina.rr.com",
    "phone": "(803) 555-0192",
    "street": "1420 Main Street",
    "city": "Columbia",
    "state": "SC",
    "zip_code": "29201",
    "county": "Richland County",
    "utility_provider": "Duke Energy Carolinas",
    "home_size": "medium",
    "custom_sqft": 2400,
    "thermostat": 70,
    "has_ev": True,
    "ev_charger_type": "7.2",
    "has_solar": False,
    "solar_size_kw": 5.0,
    "has_pool": False,
    "has_appliances": True,
    "custom_rate": 0.134,
    "backup_power": "Generac 22kW Standby Generator",
    "notifications_sms": True,
    "notifications_email": True
}

@app.get("/api/homeowner/account")
def get_homeowner_account():
    return {"account": _mock_homeowner_account}

@app.post("/api/homeowner/account")
def update_homeowner_account(payload: dict):
    global _mock_homeowner_account
    _mock_homeowner_account.update(payload)
    return {
        "status": "success",
        "message": "Account profile saved successfully",
        "account": _mock_homeowner_account
    }



