import json
import logging
import os
import random
import time
import threading
import math
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from datetime import datetime, timezone
from kafka import KafkaConsumer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
FASTAPI_URL = os.getenv("FASTAPI_URL", "http://backend:8000")
CONSUMER_USERNAME = os.getenv("CONSUMER_USERNAME", "")
CONSUMER_PASSWORD = os.getenv("CONSUMER_PASSWORD", "")

# Update frequency: 1.5 seconds for good balance
LOCATION_INTERVAL = 1.5

# Gaza maneuver constants
BASE_LAT = 31.4850
BASE_LON = 34.5050

# WIDER overall area boundaries 
MIN_LAT, MAX_LAT = 31.4500, 31.5200 
MIN_LON, MAX_LON = 34.4300, 34.5200 

# Speed parameters (8.0m/s = ~29km/h)
AVG_SPEED_M_S = 8.0
M_TO_DEG = 1.0 / 111320.0

# Define how tight the squads are: roughly 100-150m radius (in degrees)
SQUAD_OFFSET_RADIUS_DEG = 125.0 * M_TO_DEG

def _create_robust_session():
    """Creates a robust HTTP session that handles server issues"""
    session = requests.Session()
    retry_strategy = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def _login(session):
    resp = session.post(
        f"{FASTAPI_URL}/api/v1/auth/login",
        json={"username": CONSUMER_USERNAME, "password": CONSUMER_PASSWORD},
    )
    resp.raise_for_status()
    return resp.json()["data"]["token"]

def report_squad_maneuver(session, devices, event_id, auth_headers):
    """
    Simulates an entire squad moving together while individual soldiers 
    move irregularly within the team's bounding box.
    """
    squad_size = len(devices)
    if squad_size == 0:
        return
        
    log.info(f"Squad: Starting maneuver for event {event_id} with {squad_size} soldiers.")

    # Define a unique start point for THIS squad (spread along the border)
    # NORTH-SOUTH spread (wide front)
    LAT_SPREAD = 0.035 
    # EAST-WEST spread (shallow initial depth)
    LON_SPREAD = 0.005
    
    # Squad center: the collective point they move towards
    squad_center_lat = BASE_LAT + random.uniform(-LAT_SPREAD, LAT_SPREAD)
    squad_center_lon = BASE_LON + random.uniform(-LON_SPREAD, LON_SPREAD)
    
    # Collective squad heading: everyone moves generally West (270)
    squad_heading = (270.0 + random.uniform(-10.0, 10.0)) % 360.0
    squad_speed_m_s = AVG_SPEED_M_S + random.uniform(-1.0, 1.0)
    
    # Initialize individual offsets: each soldier starts randomly within the bounding box
    individual_offsets = []
    for _ in range(squad_size):
        # random angle, random radius creates a circular bounding box
        angle = random.uniform(0.0, 360.0)
        radius = random.uniform(0.0, SQUAD_OFFSET_RADIUS_DEG)
        
        offset_lat = radius * math.cos(math.radians(angle))
        offset_lon = radius * math.sin(math.radians(angle))
        
        individual_offsets.append({'lat': offset_lat, 'lon': offset_lon})

    target_reached = False
    reports_counter = 0

    while True:
        try:
            # Check event status (common for whole squad)
            resp = session.get(
                f"{FASTAPI_URL}/api/v1/events/{event_id}",
                headers=auth_headers,
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                if data.get("status") == "closed":
                    log.info(f"Squad: Event {event_id} closed")
                    break

            reports_counter += 1
            
            # --- 1. Advance the SQUAD CENTER together ---
            distance_meters = squad_speed_m_s * LOCATION_INTERVAL
            distance_deg = distance_meters * M_TO_DEG
            heading_rad = math.radians(squad_heading)
            
            squad_center_lat += distance_deg * math.cos(heading_rad)
            squad_center_lon += distance_deg * math.sin(heading_rad)

            # --- 2. Advance individual soldiers with irregular movement within the squad box ---
            squad_locations = []
            
            for i in range(squad_size):
                # Update individual offset: irregular drift/shift within the box
                # add slight, random change to existing offset
                drift_lat = random.uniform(-SQUAD_OFFSET_RADIUS_DEG * 0.15, SQUAD_OFFSET_RADIUS_DEG * 0.15)
                drift_lon = random.uniform(-SQUAD_OFFSET_RADIUS_DEG * 0.15, SQUAD_OFFSET_RADIUS_DEG * 0.15)
                
                curr_offset_lat = individual_offsets[i]['lat'] + drift_lat
                curr_offset_lon = individual_offsets[i]['lon'] + drift_lon
                
                # Snapping: ensure they don't drift too far from the collective center (bounding box limit)
                # Keep within the circular radius
                curr_radius = math.sqrt(curr_offset_lat**2 + curr_offset_lon**2)
                if curr_radius > SQUAD_OFFSET_RADIUS_DEG:
                    scale = SQUAD_OFFSET_RADIUS_DEG / curr_radius
                    curr_offset_lat *= scale
                    curr_offset_lon *= scale
                    
                # Update stored offset
                individual_offsets[i] = {'lat': curr_offset_lat, 'lon': curr_offset_lon}
                
                # --- 3. Compute final, individual GPS points ---
                final_lat = squad_center_lat + curr_offset_lat
                final_lon = squad_center_lon + curr_offset_lon
                
                squad_locations.append({'lat': final_lat, 'lon': final_lon})

            # --- 4. Report locations for ALL squad members ---
            for i, d in enumerate(devices):
                device_id = d["id"]
                api_key = d.get("api_key", "")
                
                location = {
                    "latitude": squad_locations[i]['lat'],
                    "longitude": squad_locations[i]['lon'],
                    # accuracy slightly drifts per soldier
                    "accuracy": round(AVG_SPEED_M_S + random.uniform(1.0, 3.0), 1),
                    "device_id": device_id,
                    "event_id": event_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

                session.post(
                    f"{FASTAPI_URL}/api/v1/devices/{device_id}/location",
                    json=location,
                    headers={"X-Api-Key": api_key},
                    timeout=5
                )

            # --- 5. Collective Maneuver Logic ---
            # Check boundaries and target advance for the COLLECTIVE center
            if squad_center_lon <= MIN_LON and not target_reached:
                target_reached = True
                squad_center_lon = MIN_LON
                squad_speed_m_s = 1.0  # slow patrol
                # collective heading becomes irregular (defensive circular patrol)
                squad_heading = random.uniform(0.0, 360.0)

            # Anti-stuck logic for collective center
            if squad_center_lat < MIN_LAT:
                squad_center_lat = MIN_LAT
                squad_heading = (squad_heading + random.uniform(30.0, 90.0)) % 360.0
            elif squad_center_lat > MAX_LAT:
                squad_center_lat = MAX_LAT
                squad_heading = (squad_heading - random.uniform(30.0, 90.0)) % 360.0

            # Collective heading adjustment during advance (organic drift)
            if not target_reached:
                # collective, subtle organic turn
                squad_heading = (squad_heading + random.uniform(-3.5, 3.5)) % 360.0
            else:
                # defensive patrol turn
                squad_heading = (squad_heading + random.uniform(15.0, 45.0)) % 360.0

        except requests.exceptions.RequestException as exc:
            log.warning(f"Squad ({event_id}): Server communication issue, will retry. ({exc})")
        except Exception as exc:
            log.error(f"Squad ({event_id}): Unexpected error - {exc}")

        time.sleep(LOCATION_INTERVAL)


def handle_wakeup(event_id):
    """
    Handles event wakeup by grouping all active devices into squads 
    and launching one thread per squad simulation.
    """
    session = _create_robust_session()
    try:
        token = _login(session)
    except Exception as exc:
        log.error(f"Consumer login failed: {exc}")
        return

    auth_headers = {"Authorization": f"Bearer {token}"}

    try:
        # Fetch ALL active devices
        resp = session.get(
            f"{FASTAPI_URL}/api/v1/devices",
            params={"state": "active"},
            headers=auth_headers,
            timeout=10
        )
        resp.raise_for_status()
    except Exception as exc:
        log.error(f"Failed to fetch active devices: {exc}")
        return

    all_active_devices = resp.json().get("data", [])
    if not all_active_devices:
        log.warning(f"No active devices found for event {event_id}")
        return

    total_devices = len(all_active_devices)
    log.info(f"Grouping {total_devices} active devices into tactical squads.")
    
    # --- Tactical Grouping Logic ---
    # We want squads of ~5. Use a randomized bucket approach:
    # 1. Shuffle devices randomly so squads are different each event
    random.shuffle(all_active_devices)
    
    # 2. Divide into buckets of exactly 5
    grouped_squads = []
    bucket_size = 5
    
    for i in range(0, total_devices, bucket_size):
        # create a squad bucket from current slice
        squad_bucket = all_active_devices[i:i + bucket_size]
        grouped_squads.append(squad_bucket)
        
    log.info(f"Formed {len(grouped_squads)} tactical squad(s). Launching simulations.")

    # 3. Launch ONE thread per squad (each thread simulates N devices together)
    for squad_devices in grouped_squads:
        t = threading.Thread(
            target=report_squad_maneuver, 
            args=(session, squad_devices, event_id, auth_headers)
        )
        t.daemon = True
        t.start()

def consume():
    consumer = KafkaConsumer(
        "device.wakeup",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="device-wakeup-consumer",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest"
    )
    
    log.info(f"Connecting to Kafka at {KAFKA_BOOTSTRAP_SERVERS}...")
    log.info("Consumer started, waiting for messages...")
    
    for msg in consumer:
        event_id = msg.value.get("event_id")
        if not event_id:
            continue
        log.info(f"Received wakeup for event {event_id}")
        handle_wakeup(event_id)

if __name__ == "__main__":
    consume()