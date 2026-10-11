import os
import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime



# Config 

EIA_API_KEY = "H3BxRqNZe5Q9TI0UfKa78eaDhvvvOnU6rb996Pg1"
database_URL = "postgres://tsdbadmin:tsluz0dw71gn99a8@j8p7qsilr0.ab056sk5fy.tsdb.cloud.timescale.com:32721/tsdb?sslmode=require"


def ingest_powerConsumption_data(cursor):

    url = f"https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key={EIA_API_KEY}&frequency=hourly&data[0]=value&facets[respondent][]=DUK&sort[0][column]=period&sort[0][direction]=desc&length=100"
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch data: {response.status_code} - {response.text}")
        return 0

    data = response.json()
    rows_intrested = 0
    records = data.get('response', {}).get('data',[])

    for item in records:
            period_str = item.get('period') # 'YYYY-MM-DDTHH'
            time_val = datetime.strptime(period_str, '%Y-%m-%dT%H')
            balance = item.get('respondent') # Balancing authoirty code
            value = item.get('value') #MW values


            cursor.execute("""INSERT INTO public_grid_readings (time, balancing_authority, demand_mw) VALUES (%s, %s,%s);""", (time_val, balance, value))

            rows_intrested+=1

    return rows_intrested

def ingeset_weather_data(cursor):

     LAT = 34
     LON = -81.03

     weatherURL = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph"

     print("Fetching weather data...")

     response = requests.get(weatherURL)
     if response.status_code != 200:
          print(f"Failed to fetch weather data: {response.status_code}")
          return False

     data = response.json()
     current = data.get("current", {})

     time_str = current.get("time")
     time_val = datetime.fromisoformat(time_str)
     temp_f = current.get("temperature_2m")
     wind_mph = current.get("wind_speed_10m")
     weather_code = current.get("weather_code")

     cursor.execute(
        """ INSERT INTO weather_readings (time,location_name, tempature_f, wind_speed_mph, condition_code)
        VALUES (%s,%s,%s,%s,%s);
        """,
        (time_val,"Columbia-SC", temp_f, wind_mph, weather_code)
     )
     return True

def ingest_power_plants(cursor):
    """Fetches power plants from NC and SC from the EIA API"""

    url = f"https://api.eia.gov/v2/electricity/operating-data/data/?api_key={EIA_API_KEY}&frequency=annual&data[0]=nameplate-capacity-mw&facets[state][]=NC&facets[state][]=SC&length=5000"

    try:
        response = requests.get(url, timeout=(3.0, 15.0))
        response.raise_for_status()

    except requests.exceptions.RequestException as e:
      print(f"Network error fetching pwoer plants: {e}")
      return 0
      
    data = response.json()
    records = data.get('response', {}).get('data', [])

    if not records:
        print("No plant records found.")
        return 0 

    rows_to_insert = []
    for item in records:
         plant_id = item.get('plantCode')
         plant_name = item.get('plantName')
         state = item.get('state')
         fuel = item.get('sectorName') or item.get('energysource')
         capacity = item.get('nameplate-capacity-mw')
         lat = item.get('latitude')
         lon = item.get('longitude')

         if plant_id and plant_name:
              rows_to_inst = (
                int(plant_id) if str(plant_id).isdigit() else None,
                plant_name,
                state,
                str(fuel) if fuel else "Unknown",
                float(capacity) if capacity else 0.0,
                float(lat) if lat else 0.0,
                float(lon) if lon else 0.0
              )

              rows_to_insert.append(rows_to_inst)

    if rows_to_insert:
         query = """
            INSERT INTO power_plants (plant_id, plant_name, state, primary_fuel, capacity_mw, latitude, longitude)
            VALUES %s
            ON CONFLICT (plant_id) DO UPDATE
            SET capacity_mw = EXCLUDED.capacity_mw, primary_fuel = EXCLUDED.primary_fuel;
            """

         valid_rows = [r for r in rows_to_insert if r[0] is not None]
         execute_values(cursor, query, valid_rows)
         return len(valid_rows)

    return 0

if __name__ == "__main__":

        connection = None

        try: 

            connection = psycopg2.connect(database_URL)
            cursor = connection.cursor()

            plant_count = ingest_power_plants(cursor)
            grid_count = ingest_powerConsumption_data(cursor)
            weather_success = ingeset_weather_data(cursor)

            connection.commit()
            print(f"\n--- SUCCESS ---")
            print(f"Inserted {grid_count} grid records.")

            if weather_success:
                 print("Inserted latest weather reading.")


        except Exception as e:
             print(f"Error durring ingestion: {e}")
             connection.rollback()
        finally:
             cursor.close()
             connection.close()






