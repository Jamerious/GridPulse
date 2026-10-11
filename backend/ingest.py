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
        """ INSERT INTO weather_readings (time,location_name, temperature_f, wind_speed_mph, condition_code)
        VALUES (%s,%s,%s,%s,%s);
        """,
        (time_val,"Columbia-SC", temp_f, wind_mph, weather_code)
     )
     return True

def ingest_power_plants(cursor):
    """Inserts mock power generation facilities for NC and SC into the database based on real plants"""
    mock_plants = [
        # Nuclear
        (101, "Catawba Nuclear Station", "SC", "Nuclear", 2258.0, 35.0503, -81.0745),
        (102, "McGuire Nuclear Station", "NC", "Nuclear", 2200.0, 35.4320, -80.9483),
        (106, "Oconee Nuclear Station", "SC", "Nuclear", 2538.0, 34.7939, -82.8986),
        (107, "Brunswick Nuclear Plant", "NC", "Nuclear", 1875.0, 33.9583, -78.0103),
        (108, "Shearon Harris Nuclear Plant", "NC", "Nuclear", 964.0, 35.6333, -78.9564),
        (109, "V.C. Summer Nuclear Station", "SC", "Nuclear", 966.0, 34.2981, -81.3153),

        # Coal & Steam
        (104, "Marshall Steam Station", "NC", "Coal", 2090.0, 35.5907, -80.9634),
        (110, "Roxboro Steam Station", "NC", "Coal", 2422.0, 36.4858, -79.0711),
        (111, "Cross Generating Station", "SC", "Coal", 2390.0, 33.3611, -80.1147),
        (112, "Winyah Generating Station", "SC", "Coal", 1260.0, 33.3253, -79.3517),
        (125, "Wateree Generating Station", "SC", "Coal", 700.0, 33.8275, -80.6225),

        # Natural Gas & Combined Cycle
        (113, "Dan River Combined Cycle Station", "NC", "Natural Gas", 620.0, 36.4950, -79.7153),
        (114, "Buck Combined Cycle Station", "NC", "Natural Gas", 620.0, 35.7061, -80.3756),
        (115, "Jasper Generating Station", "SC", "Natural Gas", 875.0, 32.3389, -81.1111),
        (116, "Asheville Combined Cycle Plant", "NC", "Natural Gas", 560.0, 35.4650, -82.5489),
        (117, "Lincoln Combustion Turbine Station", "NC", "Natural Gas", 1200.0, 35.4389, -81.1072),

        # Hydroelectric & Pumped Storage
        (103, "Bad Creek Hydro Station", "SC", "Hydroelectric", 1065.0, 34.9754, -82.9972),
        (118, "Fontana Dam Hydro Station", "NC", "Hydroelectric", 304.0, 35.4522, -83.8050),
        (119, "Cowans Ford Hydro Station", "NC", "Hydroelectric", 350.0, 35.4358, -80.9639),
        (120, "Lake Murray Saluda Hydro Station", "SC", "Hydroelectric", 207.0, 34.0531, -81.2189),
        (121, "Pinopolis Hydro Station", "SC", "Hydroelectric", 128.0, 33.2458, -79.9989),

        # Solar & Renewables
        (105, "Lee Solar / Mixed Facility", "SC", "Solar", 75.0, 34.9962, -81.4581),
        (122, "Conetoe Solar Facility", "NC", "Solar", 80.0, 35.8167, -77.4167),
        (123, "Innovative Solar 42", "NC", "Solar", 71.0, 34.9700, -78.9500),
        (124, "SolAmerica Hampton Solar", "SC", "Solar", 20.0, 32.8683, -81.1350)
    ]

    query = """
        INSERT INTO power_plants (plant_id, plant_name, state, primary_fuel, capacity_mw, latitude, longitude)
        VALUES %s
        ON CONFLICT (plant_id) DO UPDATE
        SET plant_name = EXCLUDED.plant_name,
            state = EXCLUDED.state,
            capacity_mw = EXCLUDED.capacity_mw,
            primary_fuel = EXCLUDED.primary_fuel,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude;
    """
    
    execute_values(cursor, query, mock_plants)
    print(f"Inserted/updated {len(mock_plants)} mock power plants into database.")
    return len(mock_plants)

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






