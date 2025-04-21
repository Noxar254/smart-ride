import os
import json
import time
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
import requests
import threading
import random
import math
from pyngrok import ngrok

# Start ngrok tunnel function
def start_ngrok():
    try:
        # Set up a tunnel to the Flask server
        public_url = ngrok.connect(5000)
        print(f"\n\n* SMART RIDE MOBILE ACCESS *")
        print(f"* Access your system from your phone at: {public_url}")
        print(f"* Share this link with others to let them access your system")
        print(f"* This link will change each time you restart the server\n")
        return public_url
    except Exception as e:
        print(f"Ngrok error: {e}")
        return None

app = Flask(__name__, static_folder='.')

# In-memory storage for bookings (in a real application, you would use a database)
bookings = []
# In-memory storage for bus locations (in a real application, this would come from a GPS device)
buses = {
    'KDQ 144F': {
        'route_id': 'route_001',
        'current_position': [40.7128, -74.0060],
        'destination': 'Columbus Circle',
        'eta': '15 minutes',
        'speed': 0,
        'heading': 0,
        'last_updated': time.time(),
        'is_moving': False,
        'capacity': 33,
        'driver': 'John Doe'
    }
}

# In-memory storage for passengers waiting for buses
passengers = {}

# In-memory storage for admin-related data
users = {}           # Users who have made bookings
staff = {}           # Drivers, conductors and admin users
subscribers = {}     # Users with active subscriptions
activity_log = []    # System activity log
active_sessions = {} # Currently active user sessions

# Subscription plans
subscription_plans = {
    'basic': {
        'name': 'Basic Plan',
        'price': 9.99,
        'features': ['10 rides per month', 'Standard booking', 'Email support']
    },
    'premium': {
        'name': 'Premium Plan',
        'price': 19.99,
        'features': ['Unlimited rides', 'Priority booking', '24/7 support']
    },
    'business': {
        'name': 'Business Plan',
        'price': 49.99,
        'features': ['Team accounts (up to 5)', 'Dedicated support', 'Ride analytics']
    }
}

# Admin users (username: password)
admin_credentials = {
    'admin': 'smartride123'
}

# Route waypoints for simulating bus movement
route_waypoints = [
    [40.7128, -74.0060],  # Start
    [40.7135, -74.0048],
    [40.7145, -74.0030],
    [40.7152, -74.0015],
    [40.7160, -74.0000],
    [40.7170, -73.9980]   # End (Columbus Circle area)
]

# Bus simulation parameters
simulation_running = False
simulation_thread = None
simulation_speed = 0.00001  # Movement speed factor

@app.route('/')
def index():
    """Serve the main page."""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files."""
    return send_from_directory('.', path)

@app.route('/api/seats', methods=['GET'])
def get_seats():
    """Get the status of all seats."""
    # In a real application, this would be fetched from a database
    booked_seats = ['seat-5', 'seat-6', 'seat-13', 'seat-22', 'seat-30']
    return jsonify({'booked_seats': booked_seats})

@app.route('/api/book', methods=['POST'])
def book_seats():
    """Book selected seats."""
    data = request.json
    
    if not data or 'seats' not in data:
        return jsonify({'error': 'No seats provided'}), 400
    
    booking = {
        'id': len(bookings) + 1,
        'name': data.get('name', ''),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'journey_date': data.get('journey_date', ''),
        'seats': data['seats'],
        'total_amount': len(data['seats']) * 10,  # $10 per seat
        'created_at': datetime.now().isoformat()
    }
    
    # If passenger location is provided, store it
    if 'latitude' in data and 'longitude' in data:
        passenger_id = f"passenger_{booking['id']}"
        passengers[passenger_id] = {
            'name': booking['name'],
            'position': [float(data['latitude']), float(data['longitude'])],
            'booking_id': booking['id'],
            'last_updated': time.time()
        }
    
    bookings.append(booking)
    
    return jsonify({
        'success': True,
        'booking': booking
    })

@app.route('/api/bus/location', methods=['GET'])
def get_bus_location():
    """Get the current location of a bus."""
    bus_id = request.args.get('bus_id', 'KDQ 144F')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Calculate how much time has passed since the last update
    current_time = time.time()
    time_diff = current_time - buses[bus_id]['last_updated']
    
    # If the bus is moving, update its position based on elapsed time
    if buses[bus_id]['is_moving']:
        update_bus_position(bus_id, time_diff)
        buses[bus_id]['last_updated'] = current_time
    
    # Include nearby passengers in the response
    nearby_passengers = get_nearby_passengers(buses[bus_id]['current_position'], 5.0)  # 5km radius
    
    # Add accuracy information for better UI feedback
    accuracy_level = 'high'  # For real tracking, this would be calculated based on GPS accuracy
    heading_cardinal = get_cardinal_direction(buses[bus_id]['heading'])
    
    # Enhanced response with more real-time data
    response = {
        **buses[bus_id],
        'nearby_passengers': nearby_passengers,
        'passenger_count': len(nearby_passengers),
        'accuracy': accuracy_level,
        'heading_cardinal': heading_cardinal,
        'server_time': current_time,
        'is_realtime': True
    }
    
    return jsonify(response)

@app.route('/api/bus/route', methods=['GET'])
def get_bus_route():
    """Get the route for a bus using OSRM."""
    bus_id = request.args.get('bus_id', 'KDQ 144F')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Get from and to parameters if provided, otherwise use default bus route
    from_point = request.args.get('from', None)
    to_point = request.args.get('to', None)
    
    if from_point and to_point:
        # Parse from and to coordinates
        try:
            from_lat, from_lng = map(float, from_point.split(','))
            to_lat, to_lng = map(float, to_point.split(','))
            coordinates = [[from_lng, from_lat], [to_lng, to_lat]]
        except ValueError:
            return jsonify({'error': 'Invalid coordinates format'}), 400
    else:
        # Use bus current position and destination
        current_pos = buses[bus_id]['current_position']
        # Use the last waypoint as destination
        destination = route_waypoints[-1]
        coordinates = [[current_pos[1], current_pos[0]], [destination[1], destination[0]]]
    
    try:
        # Make a request to the OSRM API
        # Replace this URL with your OSRM instance if you're hosting it yourself
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coordinates[0][0]},{coordinates[0][1]};{coordinates[1][0]},{coordinates[1][1]}"
        osrm_params = {
            'overview': 'full',
            'geometries': 'geojson',
            'steps': 'true'
        }
        
        response = requests.get(osrm_url, params=osrm_params)
        
        if response.status_code == 200:
            route_data = response.json()
            
            # Extract route coordinates
            if 'routes' in route_data and len(route_data['routes']) > 0:
                geometry = route_data['routes'][0]['geometry']
                duration = route_data['routes'][0]['duration']
                distance = route_data['routes'][0]['distance']
                
                # Update the ETA for the bus
                eta_minutes = int(duration / 60)
                buses[bus_id]['eta'] = f"{eta_minutes} minutes"
                
                return jsonify({
                    'route': geometry,
                    'duration': duration,
                    'distance': distance,
                    'eta': f"{eta_minutes} minutes"
                })
        
        # If we got here, something went wrong with the OSRM request
        return jsonify({
            'error': 'Failed to retrieve route',
            'status_code': response.status_code
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/bus/start-tracking', methods=['POST'])
def start_bus_tracking():
    """Start the bus movement simulation for live tracking."""
    global simulation_running, simulation_thread
    
    data = request.json or {}
    bus_id = data.get('bus_id', 'KDQ 144F')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Check if simulation is already running
    if simulation_running:
        return jsonify({'message': 'Bus tracking already active', 'status': 'already_active'})
    
    # Mark the bus as moving
    buses[bus_id]['is_moving'] = True
    buses[bus_id]['last_updated'] = time.time()
    
    # Start simulation in a separate thread
    simulation_running = True
    simulation_thread = threading.Thread(target=simulate_bus_movement, args=(bus_id,))
    simulation_thread.daemon = True
    simulation_thread.start()
    
    return jsonify({'message': 'Bus tracking started successfully', 'status': 'started'})

@app.route('/api/bus/stop-tracking', methods=['POST'])
def stop_bus_tracking():
    """Stop the bus movement simulation."""
    global simulation_running
    
    data = request.json or {}
    bus_id = data.get('bus_id', 'KDQ 144F')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Stop the simulation
    simulation_running = False
    
    # Mark the bus as stopped
    buses[bus_id]['is_moving'] = False
    buses[bus_id]['speed'] = 0
    
    return jsonify({'message': 'Bus tracking stopped successfully', 'status': 'stopped'})

@app.route('/api/passenger/update-location', methods=['POST'])
def update_passenger_location():
    """Update a passenger's location."""
    data = request.json
    
    if not data or 'passenger_id' not in data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({'error': 'Missing required data'}), 400
    
    passenger_id = data['passenger_id']
    latitude = float(data['latitude'])
    longitude = float(data['longitude'])
    
    # Create new passenger entry if it doesn't exist
    if passenger_id not in passengers:
        passengers[passenger_id] = {
            'name': data.get('name', 'Anonymous'),
            'position': [latitude, longitude],
            'last_updated': time.time()
        }
    else:
        # Update existing passenger
        passengers[passenger_id]['position'] = [latitude, longitude]
        passengers[passenger_id]['last_updated'] = time.time()
        if 'name' in data:
            passengers[passenger_id]['name'] = data['name']
    
    return jsonify({
        'success': True,
        'passenger': passengers[passenger_id]
    })

@app.route('/api/passengers/nearby', methods=['GET'])
def get_nearby_passengers_api():
    """Get passengers near a specified location."""
    try:
        latitude = float(request.args.get('latitude', 0))
        longitude = float(request.args.get('longitude', 0))
        radius = float(request.args.get('radius', 5.0))  # Default 5km radius
    except ValueError:
        return jsonify({'error': 'Invalid coordinates or radius'}), 400
    
    nearby = get_nearby_passengers([latitude, longitude], radius)
    
    return jsonify({
        'passengers': nearby,
        'count': len(nearby)
    })

def get_nearby_passengers(location, radius_km):
    """Get passengers within a certain radius of a location."""
    nearby = []
    
    for passenger_id, passenger in passengers.items():
        # Calculate distance between bus and passenger
        distance = calculate_distance(
            location[0], location[1],
            passenger['position'][0], passenger['position'][1]
        )
        
        # If within radius, add to nearby list
        if distance <= radius_km:
            nearby.append({
                'id': passenger_id,
                'name': passenger['name'],
                'position': passenger['position'],
                'distance': round(distance, 2)
            })
    
    return nearby

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in km using the Haversine formula."""
    R = 6371  # Radius of the Earth in km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    return distance

def update_bus_position(bus_id, time_diff):
    """Update the bus position based on its current state and elapsed time."""
    bus = buses[bus_id]
    
    # Determine current and next waypoint
    current_pos = bus['current_position']
    
    # Find current waypoint index
    current_index = 0
    min_distance = float('inf')
    
    for i, waypoint in enumerate(route_waypoints):
        dist = calculate_distance(current_pos[0], current_pos[1], waypoint[0], waypoint[1])
        if dist < min_distance:
            min_distance = dist
            current_index = i
    
    # If we're already at the last waypoint, start over
    if current_index >= len(route_waypoints) - 1:
        next_index = 0
    else:
        next_index = current_index + 1
    
    next_waypoint = route_waypoints[next_index]
    
    # Calculate distance to next waypoint
    distance_to_next = calculate_distance(
        current_pos[0], current_pos[1],
        next_waypoint[0], next_waypoint[1]
    )
    
    # If very close to next waypoint, move to the next one after that
    if distance_to_next < 0.01:  # 10 meters threshold
        current_index = next_index
        if current_index >= len(route_waypoints) - 1:
            next_index = 0
        else:
            next_index = current_index + 1
        next_waypoint = route_waypoints[next_index]
        
        # Recalculate distance
        distance_to_next = calculate_distance(
            current_pos[0], current_pos[1],
            next_waypoint[0], next_waypoint[1]
        )
    
    # Calculate direction vector
    dlat = next_waypoint[0] - current_pos[0]
    dlon = next_waypoint[1] - current_pos[1]
    
    # Normalize direction vector
    distance = math.sqrt(dlat*dlat + dlon*dlon)
    if distance > 0:
        dlat /= distance
        dlon /= distance
    
    # Calculate speed (km/s) - Random variations for realism
    speed_kmh = random.uniform(20, 35)  # Random speed between 20-35 km/h
    speed_kms = speed_kmh / 3600  # Convert to km/s
    
    # Calculate movement distance based on elapsed time
    move_distance = speed_kms * time_diff
    
    # Cap movement to not overshoot the waypoint
    if move_distance > distance_to_next:
        move_distance = distance_to_next
    
    # Calculate new position
    new_lat = current_pos[0] + dlat * move_distance
    new_lon = current_pos[1] + dlon * move_distance
    
    # Update bus position
    bus['current_position'] = [new_lat, new_lon]
    bus['speed'] = speed_kmh
    
    # Calculate heading (in degrees, where 0 is North)
    heading = math.degrees(math.atan2(dlon, dlat))
    if heading < 0:
        heading += 360
    bus['heading'] = heading
    
    # Recalculate ETA based on remaining waypoints
    remaining_distance = distance_to_next + sum(
        calculate_distance(
            route_waypoints[i][0], route_waypoints[i][1],
            route_waypoints[i+1][0], route_waypoints[i+1][1]
        )
        for i in range(next_index, len(route_waypoints)-1)
    )
    
    eta_hours = remaining_distance / speed_kmh
    eta_minutes = int(eta_hours * 60)
    bus['eta'] = f"{eta_minutes} minutes"

def simulate_bus_movement(bus_id):
    """Simulates bus movement along predefined route waypoints."""
    global simulation_running
    
    # Set initial waypoint to the first one if bus is at start
    bus = buses[bus_id]
    current_waypoint_index = 0
    
    # Find closest waypoint to current position
    min_distance = float('inf')
    for i, waypoint in enumerate(route_waypoints):
        dist = calculate_distance(
            bus['current_position'][0], bus['current_position'][1],
            waypoint[0], waypoint[1]
        )
        if dist < min_distance:
            min_distance = dist
            current_waypoint_index = i
    
    while simulation_running:
        # Update bus position (small increment)
        current_pos = bus['current_position']
        target_waypoint = route_waypoints[current_waypoint_index]
        
        # Calculate distance to target waypoint
        distance = calculate_distance(
            current_pos[0], current_pos[1],
            target_waypoint[0], target_waypoint[1]
        )
        
        # If close enough to waypoint, move to next waypoint
        if distance < 0.01:  # 10 meters threshold
            current_waypoint_index = (current_waypoint_index + 1) % len(route_waypoints)
            time.sleep(1)  # Pause briefly at waypoints
            continue
        
        # Direction vector to target
        dir_vector = [
            target_waypoint[0] - current_pos[0],
            target_waypoint[1] - current_pos[1]
        ]
        
        # Normalize direction
        dir_length = math.sqrt(dir_vector[0]**2 + dir_vector[1]**2)
        dir_vector = [
            dir_vector[0] / dir_length if dir_length > 0 else 0,
            dir_vector[1] / dir_length if dir_length > 0 else 0
        ]
        
        # Calculate movement increment (with some randomness for realism)
        move_step = simulation_speed * (0.8 + 0.4 * random.random())
        
        # Update position
        new_pos = [
            current_pos[0] + dir_vector[0] * move_step,
            current_pos[1] + dir_vector[1] * move_step
        ]
        
        # Calculate speed in km/h (with variations)
        speed_kmh = random.uniform(20, 35)
        
        # Calculate heading
        heading = math.degrees(math.atan2(dir_vector[1], dir_vector[0]))
        if heading < 0:
            heading += 360
        
        # Update bus data
        with threading.Lock():
            bus['current_position'] = new_pos
            bus['speed'] = speed_kmh
            bus['heading'] = heading
            bus['last_updated'] = time.time()
            
            # Calculate ETA
            remaining_waypoints = [route_waypoints[i] for i in range(current_waypoint_index, len(route_waypoints))]
            if len(remaining_waypoints) <= 1:
                remaining_waypoints.append(route_waypoints[0])  # Loop back to start
                
            # Calculate remaining distance
            remaining_distance = calculate_distance(
                new_pos[0], new_pos[1],
                remaining_waypoints[0][0], remaining_waypoints[0][1]
            )
            
            for i in range(len(remaining_waypoints)-1):
                remaining_distance += calculate_distance(
                    remaining_waypoints[i][0], remaining_waypoints[i][1],
                    remaining_waypoints[i+1][0], remaining_waypoints[i+1][1]
                )
            
            # Calculate ETA based on average speed
            eta_hours = remaining_distance / 25  # Assume average speed of 25 km/h
            eta_minutes = max(1, int(eta_hours * 60))
            bus['eta'] = f"{eta_minutes} minutes"
        
        # Sleep to control simulation speed
        time.sleep(0.1)
    
    print(f"Bus {bus_id} tracking simulation stopped")

# Admin API Routes

@app.route('/admin')
def admin_dashboard():
    """Serve the admin dashboard page."""
    return send_from_directory('.', 'admin.html')

@app.route('/api/admin/dashboard', methods=['GET'])
def get_admin_dashboard():
    """Get admin dashboard data."""
    # In a real application, you would authenticate this request
    yesterday = time.time() - 86400  # 24 hours ago
    last_week = time.time() - 604800  # 7 days ago
    
    # Calculate active users
    active_user_count = len(active_sessions)
    active_user_change = random.randint(5, 15)  # Simulated change
    
    # Calculate subscriber stats
    subscriber_count = len(subscribers)
    subscriber_change = random.randint(2, 10)  # Simulated change
    
    # Calculate bus stats
    bus_count = len(buses)
    active_bus_count = sum(1 for bus in buses.values() if bus['is_moving'])
    
    # Calculate booking stats
    today_bookings = sum(1 for booking in bookings if 
                        datetime.fromisoformat(booking['created_at']).date() == datetime.now().date())
    yesterday_bookings = random.randint(int(today_bookings * 0.8), int(today_bookings * 1.2))
    booking_change = ((today_bookings - yesterday_bookings) / yesterday_bookings * 100) if yesterday_bookings > 0 else 0
    
    return jsonify({
        'active_users': {
            'count': active_user_count,
            'change': active_user_change
        },
        'subscribers': {
            'count': subscriber_count,
            'change': subscriber_change
        },
        'buses': {
            'count': bus_count,
            'active_count': active_bus_count
        },
        'bookings': {
            'count': today_bookings,
            'change': round(booking_change, 1)
        }
    })

@app.route('/api/admin/activity', methods=['GET'])
def get_admin_activity():
    """Get admin activity log."""
    # In a real application, you would authenticate this request
    
    # Generate some sample activity if none exists
    if not activity_log:
        generate_sample_activity()
    
    return jsonify({
        'activities': sorted(activity_log, key=lambda x: x['timestamp'], reverse=True)[:20]
    })

@app.route('/api/admin/buses', methods=['GET'])
def get_admin_buses():
    """Get all buses for admin."""
    # In a real application, you would authenticate this request
    
    buses_list = []
    for bus_id, bus in buses.items():
        buses_list.append({
            'id': bus_id,
            'route_id': bus.get('route_id', 'Unknown'),
            'capacity': bus.get('capacity', 0),
            'is_moving': bus.get('is_moving', False),
            'driver': bus.get('driver', None),
            'last_location': f"{bus['current_position'][0]:.6f}, {bus['current_position'][1]:.6f}"
        })
    
    # Get available drivers
    drivers = []
    for staff_id, staff_data in staff.items():
        if staff_data['role'] == 'driver':
            drivers.append({
                'id': staff_id,
                'name': staff_data['name']
            })
    
    return jsonify({
        'buses': buses_list,
        'drivers': drivers
    })

@app.route('/api/admin/buses/locations', methods=['GET'])
def get_admin_bus_locations():
    """Get real-time bus locations for admin map."""
    # In a real application, you would authenticate this request
    
    bus_locations = []
    for bus_id, bus in buses.items():
        bus_locations.append({
            'id': bus_id,
            'position': bus['current_position'],
            'route_id': bus.get('route_id', 'Unknown'),
            'speed': bus.get('speed', 0),
            'eta': bus.get('eta', 'Unknown'),
            'is_moving': bus.get('is_moving', False),
            'last_updated': bus.get('last_updated', time.time())
        })
    
    # Get passenger locations
    passenger_list = []
    for passenger_id, passenger in passengers.items():
        passenger_list.append({
            'id': passenger_id,
            'position': passenger['position'],
            'name': passenger.get('name', 'Anonymous'),
            'last_updated': passenger.get('last_updated', time.time())
        })
    
    return jsonify({
        'buses': bus_locations,
        'passengers': passenger_list
    })

@app.route('/api/admin/buses/add', methods=['POST'])
def add_admin_bus():
    """Add a new bus."""
    # In a real application, you would authenticate this request
    data = request.json
    
    if not data or 'id' not in data or 'route_id' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if bus ID already exists
    if data['id'] in buses:
        return jsonify({'error': 'Bus ID already exists'}), 400
    
    # Create new bus entry
    buses[data['id']] = {
        'route_id': data['route_id'],
        'current_position': route_waypoints[0],  # Start at first waypoint
        'destination': 'End of Route',
        'eta': 'Not in service',
        'speed': 0,
        'heading': 0,
        'last_updated': time.time(),
        'is_moving': False,
        'capacity': data.get('capacity', 33),
        'driver': None
    }
    
    # Assign driver if provided
    if data.get('driver_id'):
        for staff_id, staff_data in staff.items():
            if staff_id == data['driver_id'] and staff_data['role'] == 'driver':
                buses[data['id']]['driver'] = staff_data['name']
                staff_data['assigned_bus'] = data['id']
                break
    
    # Log activity
    log_activity('Bus Added', f"Added new bus {data['id']}")
    
    return jsonify({
        'success': True,
        'message': f"Bus {data['id']} added successfully"
    })

@app.route('/api/admin/buses/delete/<bus_id>', methods=['DELETE'])
def delete_admin_bus(bus_id):
    """Delete a bus."""
    # In a real application, you would authenticate this request
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Remove bus assignment from any drivers
    for staff_id, staff_data in staff.items():
        if staff_data.get('assigned_bus') == bus_id:
            staff_data['assigned_bus'] = None
    
    # Delete the bus
    del buses[bus_id]
    
    # Log activity
    log_activity('Bus Deleted', f"Deleted bus {bus_id}")
    
    return jsonify({
        'success': True,
        'message': f"Bus {bus_id} deleted successfully"
    })

@app.route('/api/admin/staff', methods=['GET'])
def get_admin_staff():
    """Get all staff members."""
    # In a real application, you would authenticate this request
    
    staff_list = []
    for staff_id, staff_data in staff.items():
        staff_list.append({
            'id': staff_id,
            'name': staff_data['name'],
            'role': staff_data['role'],
            'status': staff_data['status'],
            'contact': staff_data['contact'],
            'assigned_bus': staff_data.get('assigned_bus', None)
        })
    
    return jsonify({
        'staff': staff_list
    })

@app.route('/api/admin/staff/add', methods=['POST'])
def add_admin_staff():
    """Add a new staff member."""
    # In a real application, you would authenticate this request
    data = request.json
    
    if not data or 'name' not in data or 'role' not in data or 'contact' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Generate staff ID
    staff_id = f"staff_{len(staff) + 1}"
    
    # Create new staff entry
    staff[staff_id] = {
        'name': data['name'],
        'role': data['role'],
        'status': 'active',
        'contact': data['contact'],
        'email': data.get('email', ''),
        'username': data.get('username', ''),
        'password': data.get('password', ''),  # In a real app, hash this password
        'assigned_bus': None,
        'joined_at': time.time()
    }
    
    # Log activity
    log_activity('Staff Added', f"Added new {data['role']} {data['name']}")
    
    return jsonify({
        'success': True,
        'message': f"Staff member {data['name']} added successfully",
        'staff_id': staff_id
    })

@app.route('/api/admin/staff/delete/<staff_id>', methods=['DELETE'])
def delete_admin_staff(staff_id):
    """Delete a staff member."""
    # In a real application, you would authenticate this request
    
    if staff_id not in staff:
        return jsonify({'error': 'Staff not found'}), 404
    
    # Get staff name for logging
    staff_name = staff[staff_id]['name']
    
    # Remove staff from any assigned buses
    for bus_id, bus_data in buses.items():
        if bus_data.get('driver') == staff[staff_id]['name']:
            bus_data['driver'] = None
    
    # Delete the staff
    del staff[staff_id]
    
    # Log activity
    log_activity('Staff Deleted', f"Deleted staff {staff_name}")
    
    return jsonify({
        'success': True,
        'message': f"Staff deleted successfully"
    })

@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    """Get all users."""
    # In a real application, you would authenticate this request
    
    # Generate some sample data if none exists
    if not users:
        generate_sample_users()
    
    user_list = []
    for user_id, user_data in users.items():
        user_list.append({
            'id': user_id,
            'name': user_data['name'],
            'phone': user_data['phone'],
            'email': user_data.get('email', None),
            'subscription': user_data.get('subscription', None),
            'last_activity': user_data.get('last_activity', None)
        })
    
    return jsonify({
        'users': user_list
    })

@app.route('/api/admin/users/delete/<user_id>', methods=['DELETE'])
def delete_admin_user(user_id):
    """Delete a user."""
    # In a real application, you would authenticate this request
    
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user name for logging
    user_name = users[user_id]['name']
    
    # Delete the user
    del users[user_id]
    
    # Log activity
    log_activity('User Deleted', f"Deleted user {user_name}")
    
    return jsonify({
        'success': True,
        'message': f"User deleted successfully"
    })

@app.route('/api/admin/subscriptions/add', methods=['POST'])
def add_admin_subscription():
    """Add a new subscription plan."""
    # In a real application, you would authenticate this request
    data = request.json
    
    if not data or 'name' not in data or 'price' not in data or 'features' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Generate plan ID (convert name to lowercase and replace spaces with underscores)
    plan_id = data['name'].lower().replace(' ', '_')
    
    # Create new subscription plan
    subscription_plans[plan_id] = {
        'name': data['name'],
        'price': float(data['price']),
        'features': data['features']
    }
    
    # Log activity
    log_activity('Plan Added', f"Added new subscription plan: {data['name']}")
    
    return jsonify({
        'success': True,
        'message': f"Subscription plan {data['name']} added successfully",
        'plan_id': plan_id
    })

@app.route('/api/admin/events')
def admin_events():
    """Server-sent events endpoint for real-time admin updates."""
    def event_stream():
        last_update = time.time()
        
        while True:
            # Check if there are updates to send
            current_time = time.time()
            
            # Send dashboard updates every 5 seconds
            if current_time - last_update >= 5:
                # Generate dashboard update event
                dashboard_data = generate_dashboard_update()
                yield f"event: dashboard_update\ndata: {json.dumps(dashboard_data)}\n\n"
                
                last_update = current_time
            
            # Sleep to prevent CPU overload
            time.sleep(1)
    
    return Response(event_stream(), content_type='text/event-stream')

def log_activity(activity_type, details, user=None):
    """Log an activity in the system."""
    activity = {
        'timestamp': time.time(),
        'type': activity_type,
        'user': user,
        'details': details
    }
    
    activity_log.append(activity)
    
    # Keep log size manageable (only keep last 1000 activities)
    if len(activity_log) > 1000:
        activity_log.pop(0)

def generate_sample_activity():
    """Generate sample activity data for demonstration."""
    activities = [
        ('User Login', 'User logged in from mobile device'),
        ('New Booking', 'Booked 2 seats for tomorrow'),
        ('Bus Tracking', 'Started live tracking for bus KDQ 144F'),
        ('New Subscription', 'Subscribed to Premium Plan'),
        ('Booking Canceled', 'Canceled booking #1234'),
        ('Route Changed', 'Bus route updated due to traffic'),
        ('Driver Login', 'Driver logged in to tracking system'),
        ('Payment Received', 'Payment of $20 received for booking')
    ]
    
    users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sara Williams', None]
    
    # Generate random activities over the past 24 hours
    now = time.time()
    for _ in range(20):
        activity_type, details = random.choice(activities)
        user = random.choice(users)
        timestamp = now - random.randint(0, 86400)  # Past 24 hours
        
        activity_log.append({
            'timestamp': timestamp,
            'type': activity_type,
            'user': user,
            'details': details
        })

def generate_sample_users():
    """Generate sample user data for demonstration."""
    names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sara Williams', 
             'David Brown', 'Emily Davis', 'Robert Wilson', 'Lisa Anderson']
    
    for i in range(20):
        user_id = f"user_{i+1}"
        
        subscription = None
        if i % 5 == 0:
            subscription = 'Premium Plan'
        elif i % 3 == 0:
            subscription = 'Basic Plan'
        
        users[user_id] = {
            'name': random.choice(names) if i >= 8 else names[i],
            'phone': f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            'email': f"user{i+1}@example.com" if i % 2 == 0 else None,
            'subscription': subscription,
            'last_activity': time.time() - random.randint(0, 604800)  # Past week
        }
    
    # Add some users to active sessions
    for i in range(5):
        user_id = f"user_{i+1}"
        active_sessions[user_id] = {
            'last_active': time.time() - random.randint(0, 3600)  # Past hour
        }

def generate_sample_staff():
    """Generate sample staff data if none exists."""
    if not staff:
        roles = ['driver', 'conductor', 'admin']
        names = ['John Driver', 'Mary Conductor', 'Admin User', 
                'James Smith', 'Robert Johnson', 'William Brown']
        
        for i in range(6):
            staff_id = f"staff_{i+1}"
            role = roles[i % 3]
            
            staff[staff_id] = {
                'name': names[i],
                'role': role,
                'status': 'active',
                'contact': f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                'email': f"{role}{i+1}@smartride.com",
                'username': f"{role.lower()}{i+1}",
                'password': f"password{i+1}",  # In a real app, hash this password
                'assigned_bus': None,
                'joined_at': time.time() - random.randint(0, 2592000)  # Past month
            }
        
        # Assign some drivers to buses
        for bus_id in buses:
            for staff_id, staff_data in staff.items():
                if staff_data['role'] == 'driver' and not staff_data['assigned_bus'] and not buses[bus_id].get('driver'):
                    staff_data['assigned_bus'] = bus_id
                    buses[bus_id]['driver'] = staff_data['name']
                    break

def generate_dashboard_update():
    """Generate dynamic dashboard updates for SSE."""
    global users, subscribers, active_sessions
    
    # Randomly update active users (add/remove)
    user_change = random.choice([-1, 0, 1, 1])  # Bias towards growth
    if user_change > 0 and len(users) > len(active_sessions):
        # Add a random user to active sessions
        inactive_users = [uid for uid in users if uid not in active_sessions]
        if inactive_users:
            new_active = random.choice(inactive_users)
            active_sessions[new_active] = {'last_active': time.time()}
    elif user_change < 0 and active_sessions:
        # Remove a random user from active sessions
        remove_user = random.choice(list(active_sessions.keys()))
        del active_sessions[remove_user]
    
    # Randomly update subscribers
    sub_change = random.choice([-1, 0, 0, 1])  # Bias towards stability
    if sub_change > 0:
        # Add a subscription to a random user
        non_subscribed = [uid for uid in users if not users[uid].get('subscription')]
        if non_subscribed:
            user_id = random.choice(non_subscribed)
            plan = random.choice(['Basic Plan', 'Premium Plan'])
            users[user_id]['subscription'] = plan
            subscribers[user_id] = {
                'plan': plan,
                'started_at': time.time()
            }
    elif sub_change < 0 and subscribers:
        # Remove a random subscription
        remove_sub = random.choice(list(subscribers.keys()))
        if remove_sub in users:
            users[remove_sub]['subscription'] = None
        del subscribers[remove_sub]
    
    # Calculate stats for dashboard
    yesterday = time.time() - 86400  # 24 hours ago
    last_week = time.time() - 604800  # 7 days ago
    
    active_user_count = len(active_sessions)
    subscriber_count = len(subscribers)
    
    bus_count = len(buses)
    active_bus_count = sum(1 for bus in buses.values() if bus['is_moving'])
    
    today_bookings = sum(1 for booking in bookings if 
                        datetime.fromisoformat(booking['created_at']).date() == datetime.now().date())
    
    # Generate some volatility in the stats
    active_user_change = random.randint(-5, 15)
    subscriber_change = random.randint(-2, 10)
    
    yesterday_bookings = max(0, today_bookings + random.randint(-3, 3))
    booking_change = ((today_bookings - yesterday_bookings) / yesterday_bookings * 100) if yesterday_bookings > 0 else 0
    
    return {
        'active_users': {
            'count': active_user_count,
            'change': active_user_change
        },
        'subscribers': {
            'count': subscriber_count,
            'change': subscriber_change
        },
        'buses': {
            'count': bus_count,
            'active_count': active_bus_count
        },
        'bookings': {
            'count': today_bookings,
            'change': round(booking_change, 1)
        }
    }

def get_cardinal_direction(heading):
    """Convert heading in degrees to cardinal direction."""
    directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']
    index = round(heading / 45) % 8
    return directions[index]

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    # Start ngrok tunnel for mobile access
    public_url = start_ngrok()
    
    # Generate sample data if none exists
    if not staff:
        generate_sample_staff()
    
    app.run(host='0.0.0.0', port=port, debug=True)