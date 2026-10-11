import psycopg2

database_URL = "postgres://tsdbadmin:tsluz0dw71gn99a8@j8p7qsilr0.ab056sk5fy.tsdb.cloud.timescale.com:32721/tsdb?sslmode=require"

connection = psycopg2.connect(database_URL)
cursor = connection.cursor()

cursor.execute("SELECT time, balancing_authority, demand_mw FROM public_grid_readings WHERE balancing_authority = 'DUK' ORDER BY time DESC LIMIT 10;")
rows = cursor.fetchall()

print("--- LATEST GRID READINGS ---")
for row in rows:
    print(f"Time: {row[0]} | Region: {row[1]} | Demand: {row[2]} MW")

cursor.close()
connection.close()