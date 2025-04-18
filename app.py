import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
import requests

app = Flask(__name__, static_folder='.')

# In-memory storage for bookings (in a real application, you would use a database)
bookings = []
# In-memory storage for bus locations (in a real application, this would come from a GPS device)
buses = {
    'SR-1234': {
        'route_id': 'route_001',
        'current_position': [40.7128, -74.0060],
        'destination': 'Columbus Circle',
        'eta': '15 minutes'
    }
}

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
    
    bookings.append(booking)
    
    return jsonify({
        'success': True,
        'booking': booking
    })

@app.route('/api/bus/location', methods=['GET'])
def get_bus_location():
    """Get the current location of a bus."""
    bus_id = request.args.get('bus_id', 'SR-1234')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    return jsonify(buses[bus_id])

@app.route('/api/bus/route', methods=['GET'])
def get_bus_route():
    """Get the route for a bus using OSRM."""
    bus_id = request.args.get('bus_id', 'SR-1234')
    
    if bus_id not in buses:
        return jsonify({'error': 'Bus not found'}), 404
    
    # Example coordinates (in a real app, these would be pulled from the actual route)
    coordinates = [
        [-74.0060, 40.7128],  # Start (NYC)
        [-73.9980, 40.7170]   # End (Columbus Circle area)
    ]
    
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)