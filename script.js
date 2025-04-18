// Smart Ride - City Bus Booking System JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const seats = document.querySelectorAll('.passenger-seat');
    const bookBtn = document.getElementById('book-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const trackBtn = document.getElementById('track-btn');
    const bookingModal = document.getElementById('booking-modal');
    const withdrawModal = document.getElementById('withdraw-modal');
    const trackingModal = document.getElementById('tracking-modal');
    const driverAuthModal = document.getElementById('driver-auth-modal');
    const closeBtns = document.querySelectorAll('.close');
    const selectedSeatsList = document.getElementById('selected-seats-list');
    const bookingForm = document.getElementById('booking-form');
    const withdrawForm = document.getElementById('withdraw-form');
    const driverAuthForm = document.getElementById('driver-auth-form');
    const bookedSeatsContainer = document.getElementById('booked-seats-container');
    const detectLocationBtn = document.getElementById('detect-location');
    const locationStatus = document.getElementById('location-status');
    const userLatitude = document.getElementById('user-latitude');
    const userLongitude = document.getElementById('user-longitude');
    
    // Driver tracking controls
    const driverAuthBtn = document.getElementById('driver-auth-btn');
    const startTrackingBtn = document.getElementById('start-tracking-btn');
    const stopTrackingBtn = document.getElementById('stop-tracking-btn');
    const trackingStatus = document.getElementById('tracking-status');
    const driverStatus = document.getElementById('driver-status');
    const authError = document.getElementById('auth-error');
    
    // Variables
    let selectedSeats = [];
    let seatsToWithdraw = [];
    let liveTrackingEnabled = false;
    let watchPositionId = null;
    let busMarker = null;
    let passengerMarkers = [];
    let passengerLocations = {};
    let routePath = null;
    let simulatedMovementInterval = null;
    let isDriverAuthenticated = false;
    let toastTimeout = null;
    
    // Driver authentication credentials
    const driverCredentials = {
        username: "John254#",
        password: "driverpass123"  // In a real app, this would be securely stored on a server
    };
    
    // Initialize loading screen
    createLoadingScreen();
    
    // Add toast container to the DOM
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Delay hiding loading screen to simulate app initialization
    setTimeout(() => {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.remove();
                animateElementsOnLoad();
            }, 500);
        }
    }, 1500);
    
    // Initialize widgets
    initPersistentWidgets();
    initClock();
    
    // Empty array for booked seats to start with all seats available
    const bookedSeats = [];
    
    // Booking data structure to store customer information
    const bookingData = {};
    
    // Initialize booked seats
    bookedSeats.forEach(seatId => {
        const seat = document.getElementById(seatId);
        if (seat) {
            seat.classList.add('booked');
        }
    });

    // Add animation class to elements when they enter the viewport
    function animateElementsOnLoad() {
        const elements = document.querySelectorAll('.container > *');
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('fade-in');
                element.classList.add('visible');
            }, index * 150);
        });
        
        // Show welcome toast
        showToast('Welcome to Smart Ride!', 'Your smart city bus booking solution.', 'info');
    }
    
    // Create a loading screen
    function createLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        
        const loadingIcon = document.createElement('div');
        loadingIcon.className = 'loading-icon';
        
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = 'Loading Smart Ride...';
        
        loadingScreen.appendChild(loadingIcon);
        loadingScreen.appendChild(loadingText);
        
        document.body.appendChild(loadingScreen);
    }
    
    // Show toast notification
    function showToast(title, message, type = 'info') {
        // Clear any existing toast timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add appropriate icon based on type
        let icon = '';
        switch(type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                icon = 'fas fa-info-circle';
        }
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <div>
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
            <span class="toast-close">&times;</span>
        `;
        
        // Add toast to container
        toastContainer.appendChild(toast);
        
        // Animate toast in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-close after 5 seconds
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }
    
    // Location detection
    detectLocationBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
            locationStatus.textContent = "Detecting location...";
            locationStatus.className = "detecting";
            
            // Create a progress indicator
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'location-progress';
            locationStatus.appendChild(progressIndicator);
            
            // First try with high accuracy
            tryGeolocation(true);
        } else {
            locationStatus.textContent = "Geolocation is not supported by this browser";
            locationStatus.className = "error";
            showToast('Location Error', 'Geolocation is not supported by this browser.', 'error');
        }
    });

    function tryGeolocation(highAccuracy = true) {
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                userLatitude.value = position.coords.latitude;
                userLongitude.value = position.coords.longitude;
                
                const accuracy = Math.round(position.coords.accuracy);
                let accuracyClass = "success";
                let accuracyMessage = "High";
                
                // Determine accuracy level based on the actual accuracy in meters
                if (accuracy > 100) {
                    accuracyMessage = "Low";
                    accuracyClass = "warning";
                } else if (accuracy > 20) {
                    accuracyMessage = "Medium";
                    accuracyClass = "medium";
                }
                
                locationStatus.innerHTML = '';  // Clear progress indicator
                locationStatus.textContent = `Location detected (${accuracyMessage} accuracy: ~${accuracy}m)`;
                locationStatus.className = accuracyClass;
                
                // Show success toast based on accuracy
                if (accuracyClass === "success") {
                    showToast('Location Found', 'Your location was detected with high accuracy.', 'success');
                } else if (accuracyClass === "medium") {
                    showToast('Location Found', 'Your location was detected with medium accuracy.', 'info');
                } else {
                    showToast('Location Found', 'Your location was detected with low accuracy.', 'warning');
                }
                
                // Enhanced reverse geocoding with error handling and more precise results
                reverseGeocode(position.coords.latitude, position.coords.longitude);
            },
            // Error callback
            function(error) {
                // If high accuracy fails, try with lower accuracy settings
                if (highAccuracy && error.code === error.TIMEOUT) {
                    locationStatus.textContent = "High accuracy timed out, trying with standard accuracy...";
                    setTimeout(() => tryGeolocation(false), 500);
                    return;
                }
                
                locationStatus.textContent = "Error: " + getLocationErrorMessage(error);
                locationStatus.className = "error";
                userLatitude.value = "";
                userLongitude.value = "";
                
                showToast('Location Error', getLocationErrorMessage(error), 'error');
            },
            // Options - adjust for better accuracy
            {
                enableHighAccuracy: highAccuracy,
                timeout: highAccuracy ? 15000 : 10000,  // Longer timeout for high accuracy
                maximumAge: 0  // Don't use cached position
            }
        );
    }

    function reverseGeocode(latitude, longitude) {
        // Add a visual indicator that geocoding is in progress
        const locationDetails = document.getElementById('location-details');
        locationDetails.value = "Getting address details...";
        
        // Enhanced geocoding using OpenStreetMap Nominatim with detailed parameters
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.display_name) {
                    // Format the address in a more readable way
                    let formattedAddress = '';
                    
                    if (data.address) {
                        const address = data.address;
                        const addressParts = [];
                        
                        // Create a more structured address
                        if (address.road || address.house_number) {
                            const roadPart = [address.house_number, address.road].filter(Boolean).join(' ');
                            addressParts.push(roadPart);
                        }
                        
                        if (address.suburb || address.neighbourhood) {
                            addressParts.push(address.suburb || address.neighbourhood);
                        }
                        
                        if (address.city || address.town || address.village) {
                            addressParts.push(address.city || address.town || address.village);
                        }
                        
                        if (address.state || address.county) {
                            addressParts.push(address.state || address.county);
                        }
                        
                        if (address.postcode) {
                            addressParts.push(address.postcode);
                        }
                        
                        formattedAddress = addressParts.join(', ');
                    }
                    
                    // If we couldn't parse the address details, use the display name
                    if (!formattedAddress) {
                        formattedAddress = data.display_name;
                    }
                    
                    locationDetails.value = formattedAddress;
                    
                    // Add a note about manually verifying the address
                    locationDetails.value += "\n\nPlease verify this location and add any landmarks or additional details.";
                    
                    showToast('Address Found', 'Your address has been retrieved successfully.', 'success');
                }
            })
            .catch(error => {
                console.error("Error getting address:", error);
                locationDetails.value = "Couldn't retrieve address details. Please enter your location manually.";
                // Still keep the coordinates
                locationDetails.value += `\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                
                showToast('Address Error', 'Could not retrieve address details. Please enter your location manually.', 'warning');
            });
    }

    function getLocationErrorMessage(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                return "Location permission was denied. Please check your browser settings and allow location access.";
            case error.POSITION_UNAVAILABLE:
                return "Location information is unavailable. Please try again outdoors or with GPS enabled.";
            case error.TIMEOUT:
                return "The request to get location timed out. Please try again.";
            case error.UNKNOWN_ERROR:
                return "An unknown error occurred. Please try again later.";
            default:
                return "Error getting location. Please try again.";
        }
    }
    
    // Seat selection event with enhanced feedback
    seats.forEach(seat => {
        seat.addEventListener('click', function() {
            // Skip if seat is already booked
            if (this.classList.contains('booked')) {
                showToast('Seat Unavailable', `Seat ${this.textContent} is already booked.`, 'error');
                return;
            }
            
            // Toggle seat selection with audio feedback
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                selectedSeats = selectedSeats.filter(seatId => seatId !== this.id);
                playSoundEffect('deselect');
                showToast('Seat Deselected', `Seat ${this.textContent} removed from selection.`, 'info');
            } else {
                this.classList.add('selected');
                selectedSeats.push(this.id);
                playSoundEffect('select');
                showToast('Seat Selected', `Seat ${this.textContent} added to your selection.`, 'success');
            }
            
            // Add a quick pulse animation
            this.classList.add('pulse-once');
            setTimeout(() => {
                this.classList.remove('pulse-once');
            }, 300);
            
            // Update booking button state
            if (selectedSeats.length > 0) {
                bookBtn.disabled = false;
                bookBtn.classList.add('active');
            } else {
                bookBtn.disabled = true;
                bookBtn.classList.remove('active');
            }
        });
    });
    
    // Simple sound effects for UI feedback
    function playSoundEffect(type) {
        // In a production app, you would implement actual sound effects
        // This is a placeholder for the concept
        console.log(`Playing ${type} sound effect`);
    }
    
    // Open booking modal with animation
    bookBtn.addEventListener('click', function() {
        // Populate selected seats
        selectedSeatsList.innerHTML = '';
        selectedSeats.forEach(seatId => {
            const seatSpan = document.createElement('span');
            seatSpan.classList.add('selected-seat-tag');
            seatSpan.textContent = document.getElementById(seatId).textContent;
            selectedSeatsList.appendChild(seatSpan);
        });
        
        // Set minimum date for journey to today
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById('journey-date').setAttribute('min', formattedDate);
        
        // Reset location fields
        locationStatus.textContent = "Not detected";
        locationStatus.className = "";
        userLatitude.value = "";
        userLongitude.value = "";
        document.getElementById('location-details').value = "";
        
        // Show modal with animation
        bookingModal.style.display = 'block';
        setTimeout(() => {
            bookingModal.classList.add('modal-active');
        }, 10);
    });
    
    // Open withdraw booking modal with animation
    withdrawBtn.addEventListener('click', function() {
        // Populate booked seats in the grid
        populateBookedSeatsGrid();
        
        // Show modal with animation
        withdrawModal.style.display = 'block';
        setTimeout(() => {
            withdrawModal.classList.add('modal-active');
        }, 10);
    });
    
    // Populate the booked seats grid in the withdraw modal
    function populateBookedSeatsGrid() {
        bookedSeatsContainer.innerHTML = '';
        
        if (bookedSeats.length === 0) {
            bookedSeatsContainer.innerHTML = '<p>No booked seats found.</p>';
            return;
        }
        
        bookedSeats.forEach((seatId, index) => {
            const seat = document.getElementById(seatId);
            if (seat) {
                const seatDiv = document.createElement('div');
                seatDiv.classList.add('booked-seat-item');
                seatDiv.dataset.seatId = seatId;
                seatDiv.textContent = `Seat ${seat.textContent}`;
                
                // Add staggered animation
                setTimeout(() => {
                    seatDiv.classList.add('fade-in');
                    seatDiv.classList.add('visible');
                }, index * 100);
                
                // Add click event to select for withdrawal
                seatDiv.addEventListener('click', function() {
                    this.classList.toggle('selected-for-withdrawal');
                    
                    // Add or remove from seatsToWithdraw array
                    const seatId = this.dataset.seatId;
                    if (this.classList.contains('selected-for-withdrawal')) {
                        if (!seatsToWithdraw.includes(seatId)) {
                            seatsToWithdraw.push(seatId);
                            playSoundEffect('select');
                        }
                    } else {
                        seatsToWithdraw = seatsToWithdraw.filter(id => id !== seatId);
                        playSoundEffect('deselect');
                    }
                });
                
                bookedSeatsContainer.appendChild(seatDiv);
            }
        });
    }
    
    // Open tracking modal with animation
    trackBtn.addEventListener('click', function() {
        trackingModal.style.display = 'block';
        setTimeout(() => {
            trackingModal.classList.add('modal-active');
        }, 10);
        initMap();
    });
    
    // Bus tracking controls for driver/conductor with enhanced feedback
    driverAuthBtn.addEventListener('click', function() {
        // Show the driver authentication modal with animation
        driverAuthModal.style.display = 'block';
        setTimeout(() => {
            driverAuthModal.classList.add('modal-active');
        }, 10);
    });
    
    startTrackingBtn.addEventListener('click', function() {
        startLiveTracking();
    });
    
    stopTrackingBtn.addEventListener('click', function() {
        stopLiveTracking();
    });
    
    // Start live location tracking with enhanced visual feedback
    function startLiveTracking() {
        // Check if driver is authenticated
        if (!isDriverAuthenticated) {
            showToast('Authentication Required', 'Please login as a driver or conductor first.', 'error');
            return;
        }
        
        if (navigator.geolocation && !liveTrackingEnabled) {
            // Visual feedback for starting tracking
            showToast('Starting Tracking', 'Initializing live location tracking...', 'info');
            
            // Update UI with animation
            startTrackingBtn.disabled = true;
            startTrackingBtn.classList.add('fade-out');
            
            stopTrackingBtn.disabled = false;
            stopTrackingBtn.classList.add('fade-in');
            
            trackingStatus.innerHTML = '<span class="live-tracking-indicator"></span> Live tracking active';
            trackingStatus.classList.add('active');
            trackingStatus.classList.remove('inactive');
            
            // Add animation to the tracking status
            trackingStatus.classList.add('pulse-once');
            setTimeout(() => {
                trackingStatus.classList.remove('pulse-once');
            }, 500);
            
            liveTrackingEnabled = true;
            
            // Start watching position with high accuracy
            watchPositionId = navigator.geolocation.watchPosition(
                // Success callback
                updateBusPosition,
                // Error callback
                function(error) {
                    console.error("Error tracking position:", error);
                    showToast('Tracking Error', getLocationErrorMessage(error), 'error');
                    stopLiveTracking();
                },
                // Options
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
            
            // Simulate connected passengers (in a real app, this would be done via a server)
            simulatePassengerConnections();
            
            // Notification after successful start
            setTimeout(() => {
                showToast('Tracking Active', 'Live bus location tracking is now active.', 'success');
            }, 1500);
        } else {
            showToast('Tracking Error', 'Geolocation is not supported by this browser or tracking is already active.', 'error');
        }
    }
    
    // Stop live location tracking with visual feedback
    function stopLiveTracking() {
        // Check if driver is authenticated
        if (!isDriverAuthenticated) {
            showToast('Authentication Required', 'Please login as a driver or conductor first.', 'error');
            return;
        }
        
        // Check if tracking is active
        if (!liveTrackingEnabled) {
            showToast('Tracking Inactive', 'Tracking is not currently active.', 'warning');
            return;
        }
        
        // Visual feedback for stopping tracking
        showToast('Stopping Tracking', 'Ending live location tracking...', 'info');
        
        if (watchPositionId !== null) {
            navigator.geolocation.clearWatch(watchPositionId);
            watchPositionId = null;
        }
        
        // Update UI with animation
        startTrackingBtn.disabled = false;
        startTrackingBtn.classList.remove('fade-out');
        
        stopTrackingBtn.disabled = true;
        stopTrackingBtn.classList.remove('fade-in');
        
        trackingStatus.textContent = "Tracking inactive";
        trackingStatus.classList.remove('active');
        trackingStatus.classList.add('inactive');
        
        // Add animation to the tracking status
        trackingStatus.classList.add('pulse-once');
        setTimeout(() => {
            trackingStatus.classList.remove('pulse-once');
        }, 500);
        
        liveTrackingEnabled = false;
        
        // Clear simulated movement
        if (simulatedMovementInterval !== null) {
            clearInterval(simulatedMovementInterval);
            simulatedMovementInterval = null;
        }
        
        // Remove path if it exists
        if (routePath && window.busMap) {
            window.busMap.removeLayer(routePath);
            routePath = null;
        }
        
        // Notification after successful stop
        setTimeout(() => {
            showToast('Tracking Stopped', 'Live bus location tracking has been stopped.', 'warning');
        }, 1000);
    }
    
    // Update bus position on the map with enhanced visuals
    function updateBusPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // If map is initialized
        if (window.busMap) {
            // Create bus marker if it doesn't exist
            if (!busMarker) {
                // Custom bus icon for better visibility
                const busIcon = L.divIcon({
                    className: 'bus-marker-icon',
                    html: '<div class="bus-icon"><i class="fas fa-bus"></i></div>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                busMarker = L.marker([latitude, longitude], {icon: busIcon}).addTo(window.busMap);
                busMarker.bindPopup("<strong>Smart Ride Bus #SR-1234</strong><br><span class='live-tag'>LIVE</span>").openPopup();
                window.busMap.setView([latitude, longitude], 15);
                
                // Add pulsing effect to the marker
                const busMarkerElement = busMarker.getElement();
                if (busMarkerElement) {
                    busMarkerElement.classList.add('pulsing-marker');
                }
                
                showToast('Bus Located', 'Live bus position established on the map.', 'success');
            } else {
                // Smoothly animate to new position
                const oldLatLng = busMarker.getLatLng();
                const newLatLng = L.latLng(latitude, longitude);
                
                // Calculate distance moved for notifications
                const distance = calculateDistance(
                    oldLatLng.lat, oldLatLng.lng,
                    latitude, longitude
                ) * 1000; // Convert to meters
                
                // Only animate if moved sufficiently
                if (distance > 5) {
                    // Animate the marker movement
                    animateMarker(busMarker, newLatLng, 500);
                    
                    // Provide periodic updates about significant movements
                    if (distance > 100) {
                        showToast('Bus Moving', `Bus has moved ${Math.round(distance)}m.`, 'info');
                    }
                } else {
                    // Just update position without animation for tiny movements
                    busMarker.setLatLng(newLatLng);
                }
            }
            
            // Update route path if we have previous positions
            updateRoutePath(latitude, longitude);
            
            // Update any connected passenger maps
            updatePassengerMaps(latitude, longitude);
            
            // Perform reverse geocoding to show readable location
            updateLocationDisplay(latitude, longitude);
        }
    }
    
    // Animate marker movement smoothly
    function animateMarker(marker, newLatLng, duration) {
        const oldLatLng = marker.getLatLng();
        let start = Date.now();
        
        function frame() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate intermediate position
            const lat = oldLatLng.lat + (newLatLng.lat - oldLatLng.lat) * progress;
            const lng = oldLatLng.lng + (newLatLng.lng - oldLatLng.lng) * progress;
            
            // Update marker position
            marker.setLatLng([lat, lng]);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }
        
        // Start animation
        frame();
    }
    
    // Update the route path on the map with enhanced styling
    function updateRoutePath(latitude, longitude) {
        // Create or update path array
        if (!window.busPathPoints) {
            window.busPathPoints = [[latitude, longitude]];
        } else {
            // Add new point if it's sufficiently far from the last point (to avoid cluttering with similar points)
            const lastPoint = window.busPathPoints[window.busPathPoints.length - 1];
            const distance = calculateDistance(lastPoint[0], lastPoint[1], latitude, longitude);
            if (distance > 0.01) { // Add point if more than ~10 meters away
                window.busPathPoints.push([latitude, longitude]);
            }
        }
        
        // Remove old path if it exists
        if (routePath && window.busMap) {
            window.busMap.removeLayer(routePath);
        }
        
        // Create new path with enhanced styling
        if (window.busPathPoints.length > 1) {
            routePath = L.polyline(window.busPathPoints, {
                color: '#1a73e8',
                weight: 5,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: '10, 10',
                dashOffset: '0'
            }).addTo(window.busMap);
            
            // Add animated dash effect to the path
            animateRoutePath();
        }
    }
    
    // Animate the route path with a moving dash effect
    function animateRoutePath() {
        if (!routePath) return;
        
        let dashOffset = 0;
        const animatePath = setInterval(() => {
            dashOffset -= 1;
            if (routePath) {
                routePath.setStyle({
                    dashOffset: dashOffset.toString()
                });
            } else {
                clearInterval(animatePath);
            }
        }, 100);
    }
    
    // Calculate distance between two points (using Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
    }
    
    // Update the current location display using reverse geocoding
    function updateLocationDisplay(latitude, longitude) {
        // In a real app, this would use a geocoding service
        // Here we'll just update with coordinates and animated "live" indicator
        const currentLocationElement = document.getElementById('current-location');
        currentLocationElement.innerHTML = `
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)} 
            <span class="live-badge">
                <span class="live-dot"></span> LIVE
            </span>
        `;
        
        // Simulate ETA calculation with animated progress
        const etaElement = document.getElementById('eta');
        etaElement.innerHTML = `
            <span class="calculating">
                Calculating based on live data
                <span class="dot-animation">.</span>
                <span class="dot-animation">.</span>
                <span class="dot-animation">.</span>
            </span>
        `;
        
        // Simulate a more sophisticated ETA calculation after a delay
        setTimeout(() => {
            // In a real app, this would be calculated based on route, traffic, etc.
            etaElement.innerHTML = `
                <span class="eta-badge">
                    <i class="fas fa-clock"></i> Approximately 12 minutes
                </span>
            `;
            
            // Add a subtle animation to the ETA display
            etaElement.classList.add('pulse-once');
            setTimeout(() => {
                etaElement.classList.remove('pulse-once');
            }, 500);
        }, 2000);
    }
    
    // Simulate passenger connections with enhanced visual feedback
    function simulatePassengerConnections() {
        // In a real app, this would use WebSockets or a similar technology
        // to establish connections with passengers' devices
        
        // Simulate passenger locations (normally these would come from the booking data)
        passengerLocations = {
            // These would be real passengers who have shared their location
            'passenger1': { lat: 40.7135, lng: -74.0030, name: "John D" },
            'passenger2': { lat: 40.7150, lng: -74.0015, name: "Sarah J" },
            'passenger3': { lat: 40.7160, lng: -74.0005, name: "Mike B" }
        };
        
        // Visual feedback for passenger connections
        showToast('Passengers Connected', `Connected to ${Object.keys(passengerLocations).length} waiting passengers.`, 'success');
        
        // Add passenger markers to the map with custom icons
        if (window.busMap) {
            Object.values(passengerLocations).forEach((passenger, index) => {
                // Custom passenger icon
                const passengerIcon = L.divIcon({
                    className: 'passenger-marker-icon',
                    html: `<div class="passenger-icon"><i class="fas fa-user"></i></div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                // Add marker with staggered animation
                setTimeout(() => {
                    const marker = L.marker([passenger.lat, passenger.lng], {icon: passengerIcon})
                        .addTo(window.busMap)
                        .bindPopup(`<strong>${passenger.name}</strong><br>Waiting for bus`);
                    
                    passengerMarkers.push(marker);
                    
                    // Add connecting lines between bus and passengers
                    if (busMarker) {
                        const busPosition = busMarker.getLatLng();
                        const connectionLine = L.polyline(
                            [[busPosition.lat, busPosition.lng], [passenger.lat, passenger.lng]],
                            {
                                color: '#5e17eb',
                                weight: 2,
                                opacity: 0.6,
                                dashArray: '5, 10'
                            }
                        ).addTo(window.busMap);
                        
                        // Store the connection line
                        passenger.connectionLine = connectionLine;
                    }
                }, index * 500);
            });
        }
    }
    
    // Update passenger maps with bus location
    function updatePassengerMaps(busLat, busLng) {
        // In a real application, this would send data to connected passenger devices
        // Here we'll update the connection lines between bus and passengers
        
        Object.values(passengerLocations).forEach(passenger => {
            // Update connection line if it exists
            if (passenger.connectionLine && window.busMap) {
                passenger.connectionLine.setLatLngs([
                    [busLat, busLng],
                    [passenger.lat, passenger.lng]
                ]);
            }
            
            // Calculate distance between bus and passenger
            const distance = calculateDistance(
                busLat, busLng, 
                passenger.lat, passenger.lng
            );
            
            // Calculate ETA based on distance (very simplified)
            const etaMinutes = Math.round(distance * 10); // Simple approximation
            
            // In a real app, this data would be sent to the passenger's device
            console.log(`ETA for ${passenger.name}: ${etaMinutes} minutes (${distance.toFixed(2)} km away)`);
        });
    }
    
    // Initialize map for bus tracking with enhanced visuals
    function initMap() {
        // Check if Leaflet is loaded
        if (typeof L !== 'undefined') {
            // If map container already has a map, remove it
            if (window.busMap) {
                window.busMap.remove();
            }
            
            // Show loading indicator in map container
            document.getElementById('map').innerHTML = `
                <div class="map-loading">
                    <div class="map-loading-spinner"></div>
                    <div class="map-loading-text">Loading map...</div>
                </div>
            `;
            
            // Create map with a slight delay for a smoother transition
            setTimeout(() => {
                // Create map centered on default location (example: New York)
                window.busMap = L.map('map', {
                    zoomControl: false,  // We'll add it in a better position
                    attributionControl: false  // We'll add a custom attribution
                }).setView([40.7128, -74.0060], 13);
                
                // Add custom-styled zoom control
                L.control.zoom({
                    position: 'bottomright'
                }).addTo(window.busMap);
                
                // Add custom attribution
                L.control.attribution({
                    position: 'bottomleft',
                    prefix: 'Smart Ride &copy; ' + new Date().getFullYear()
                }).addAttribution('Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors').addTo(window.busMap);
                
                // Add a stylish tile layer (you can choose different styles)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19
                }).addTo(window.busMap);
                
                // Add a custom styled marker for the bus
                const busIcon = L.divIcon({
                    className: 'bus-marker-icon',
                    html: '<div class="bus-icon"><i class="fas fa-bus"></i></div>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                const busMarker = L.marker([40.7128, -74.0060], {icon: busIcon}).addTo(window.busMap);
                busMarker.bindPopup("<strong>Smart Ride Bus #SR-1234</strong><br>Currently stationary").openPopup();
                
                // Simulate bus movement with enhanced animation
                simulateBusMovement(busMarker);
                
                // Update current location text with animation
                document.getElementById('current-location').innerHTML = 'Broadway & 5th Avenue';
                document.getElementById('eta').innerHTML = '15 minutes';
                
                showToast('Map Loaded', 'Bus tracking map has been initialized.', 'info');
            }, 500);
        } else {
            console.error("Leaflet library not loaded!");
            document.getElementById('map').innerHTML = `
                <div class="map-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Map loading failed. Please check your internet connection.</p>
                    <button class="btn retry-btn" onclick="location.reload()">Retry</button>
                </div>
            `;
            
            showToast('Map Error', 'Could not load map. Please check your internet connection.', 'error');
        }
    }
    
    // Simulate bus movement on the map with enhanced animation
    function simulateBusMovement(marker) {
        // Example route points (in a real app, these would come from the OSRM API)
        const routePoints = [
            [40.7128, -74.0060], // Starting point
            [40.7135, -74.0048],
            [40.7145, -74.0030],
            [40.7152, -74.0015],
            [40.7160, -74.0000],
            [40.7170, -73.9980]  // Ending point
        ];
        
        let pointIndex = 0;
        
        // Create initial route path
        const initialPath = L.polyline([routePoints[0]], {
            color: '#1a73e8',
            weight: 5,
            opacity: 0.7,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: '10, 10'
        }).addTo(window.busMap);
        
        // Move the bus along the route with smooth animation
        const movementInterval = setInterval(() => {
            if (pointIndex >= routePoints.length - 1) {
                clearInterval(movementInterval);
                return;
            }
            
            // Get current and next points
            const currentPoint = routePoints[pointIndex];
            pointIndex++;
            const nextPoint = routePoints[pointIndex];
            
            // Animate the marker movement
            animateMarker(marker, L.latLng(nextPoint[0], nextPoint[1]), 2000);
            
            // Update the path
            initialPath.setLatLngs(routePoints.slice(0, pointIndex + 1));
            
            // Update ETA as bus moves with animation
            const remainingPoints = routePoints.length - pointIndex - 1;
            const eta = remainingPoints * 3; // 3 minutes per point
            
            const etaElement = document.getElementById('eta');
            etaElement.innerHTML = `
                <span class="eta-badge updating">
                    <i class="fas fa-clock"></i> ${eta} minutes
                </span>
            `;
            
            // Add animation to ETA update
            etaElement.classList.add('pulse-once');
            setTimeout(() => {
                etaElement.classList.remove('pulse-once');
                etaElement.querySelector('.updating').classList.remove('updating');
            }, 500);
            
            // Update current location with animated transition
            const locations = [
                "Broadway & 5th Avenue",
                "Madison Square",
                "Times Square",
                "Central Park South",
                "Columbus Circle"
            ];
            
            if (pointIndex < locations.length) {
                const locationElement = document.getElementById('current-location');
                locationElement.classList.add('fade-out');
                setTimeout(() => {
                    locationElement.textContent = locations[pointIndex];
                    locationElement.classList.remove('fade-out');
                    locationElement.classList.add('fade-in');
                    setTimeout(() => {
                        locationElement.classList.remove('fade-in');
                    }, 300);
                }, 300);
            }
        }, 3000);
    }
    
    // Close modals with animation
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const parentModal = this.closest('.modal');
            
            // Add closing animation
            parentModal.classList.remove('modal-active');
            
            // Wait for animation to finish before hiding
            setTimeout(() => {
                parentModal.style.display = 'none';
                // Clear withdrawal selections when closing the modal
                if (parentModal === withdrawModal) {
                    seatsToWithdraw = [];
                }
            }, 300);
        });
    });
    
    // Close modal when clicking outside with animation
    window.addEventListener('click', function(event) {
        const modals = [bookingModal, withdrawModal, trackingModal, driverAuthModal];
        
        modals.forEach(modal => {
            if (event.target === modal) {
                // Add closing animation
                modal.classList.remove('modal-active');
                
                // Wait for animation to finish before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                    // Clear withdrawal selections when closing the modal
                    if (modal === withdrawModal) {
                        seatsToWithdraw = [];
                    }
                }, 300);
            }
        });
    });
    
    // Handle booking form submission with enhanced feedback
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const journeyDate = document.getElementById('journey-date').value;
        const locationDetails = document.getElementById('location-details').value;
        const latitude = userLatitude.value;
        const longitude = userLongitude.value;
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Formatted location info
        let locationInfo = locationDetails;
        if (latitude && longitude) {
            locationInfo += ` (${latitude.substring(0, 8)}, ${longitude.substring(0, 8)})`;
        }
        
        // Simulate API call to book seats
        setTimeout(() => {
            // Mark selected seats as booked
            selectedSeats.forEach(seatId => {
                const seat = document.getElementById(seatId);
                
                // Add transition effect
                seat.classList.add('transition-to-booked');
                
                // After transition, change class to booked
                setTimeout(() => {
                    seat.classList.remove('selected');
                    seat.classList.remove('transition-to-booked');
                    seat.classList.add('booked');
                    
                    // Add to bookedSeats array
                    if (!bookedSeats.includes(seatId)) {
                        bookedSeats.push(seatId);
                    }
                    
                    // Store booking data
                    bookingData[seatId] = {
                        name: name,
                        phone: phone,
                        journeyDate: journeyDate,
                        location: locationInfo
                    };
                }, 500);
            });
            
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            // Show success message
            showToast('Booking Successful', `${selectedSeats.length} seat(s) booked for ${journeyDate}.`, 'success');
            
            // Show confirmation with more details in a different toast
            setTimeout(() => {
                showToast('Booking Details', `Name: ${name} | Phone: ${phone.substring(0, 3)}***${phone.substring(phone.length-2)}`, 'info');
            }, 1000);
            
            // Reset form and selected seats
            bookingForm.reset();
            selectedSeats = [];
            
            // Close modal with animation
            bookingModal.classList.remove('modal-active');
            setTimeout(() => {
                bookingModal.style.display = 'none';
            }, 300);
            
            bookBtn.disabled = true;
        }, 1500); // Longer delay to simulate processing
    });
    
    // Handle withdraw form submission with enhanced feedback
    withdrawForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const phone = document.getElementById('booking-phone').value;
        
        if (seatsToWithdraw.length === 0) {
            showToast('Selection Required', 'Please select at least one seat to withdraw.', 'warning');
            return;
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Verify phone against booking data
        const validWithdrawals = seatsToWithdraw.filter(seatId => 
            bookingData[seatId] && bookingData[seatId].phone === phone
        );
        
        if (validWithdrawals.length === 0) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showToast('Verification Failed', 'No matching bookings found for the provided phone number.', 'error');
            return;
        }
        
        // Process valid withdrawals with visual feedback
        setTimeout(() => {
            validWithdrawals.forEach((seatId, index) => {
                const seat = document.getElementById(seatId);
                if (seat) {
                    // Stagger animations
                    setTimeout(() => {
                        // Add transition effect
                        seat.classList.add('transition-from-booked');
                        
                        // After transition, remove booked class
                        setTimeout(() => {
                            seat.classList.remove('booked');
                            seat.classList.remove('transition-from-booked');
                            
                            // Remove from bookedSeats array
                            const seatIndex = bookedSeats.indexOf(seatId);
                            if (seatIndex !== -1) {
                                bookedSeats.splice(seatIndex, 1);
                            }
                            
                            // Remove booking data
                            delete bookingData[seatId];
                        }, 500);
                    }, index * 300); // Stagger by 300ms
                }
            });
            
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            // Show success message
            showToast('Withdrawal Successful', `${validWithdrawals.length} seat(s) withdrawn.`, 'success');
            
            // Reset form and selections
            withdrawForm.reset();
            seatsToWithdraw = [];
            
            // Close modal with animation
            withdrawModal.classList.remove('modal-active');
            setTimeout(() => {
                withdrawModal.style.display = 'none';
            }, 300);
        }, 1500); // Longer delay to simulate processing
    });
    
    // Driver authentication with enhanced feedback
    driverAuthForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('driver-username').value;
        const password = document.getElementById('driver-password').value;
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        
        // Check credentials against stored values
        setTimeout(() => {
            if (username === driverCredentials.username && password === driverCredentials.password) {
                // Authentication successful
                isDriverAuthenticated = true;
                
                // Update UI with animation
                driverStatus.textContent = `Authenticated as ${username}`;
                driverStatus.classList.add('authenticated');
                
                // Add animation to the status
                driverStatus.classList.add('pulse-once');
                setTimeout(() => {
                    driverStatus.classList.remove('pulse-once');
                }, 500);
                
                // Enable tracking controls with animation
                startTrackingBtn.disabled = false;
                startTrackingBtn.classList.add('fade-in');
                driverAuthBtn.disabled = true;
                driverAuthBtn.classList.add('fade-out');
                
                // Hide authentication modal with animation
                driverAuthModal.classList.remove('modal-active');
                setTimeout(() => {
                    driverAuthModal.style.display = 'none';
                }, 300);
                
                // Clear error if any
                authError.textContent = '';
                
                // Show success toast
                showToast('Authentication Successful', `Logged in as Driver ${username}`, 'success');
            } else {
                // Authentication failed
                isDriverAuthenticated = false;
                
                // Show error with animation
                authError.textContent = 'Invalid username or password. Please try again.';
                authError.classList.add('shake');
                setTimeout(() => {
                    authError.classList.remove('shake');
                }, 500);
                
                // Show error toast
                showToast('Authentication Failed', 'Invalid username or password. Please try again.', 'error');
            }
            
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }, 1500); // Simulate delay for verification
    });
    
    // Add CSS classes for our new animations
    addAnimationStyles();
    
    // Add custom animation styles dynamically
    function addAnimationStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Pulse animation for single use */
            .pulse-once {
                animation: pulseOnce 0.5s ease-in-out;
            }
            
            @keyframes pulseOnce {
                0% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
                100% {
                    transform: scale(1);
                }
            }
            
            /* Transition animations for seats */
            .transition-to-booked {
                animation: toBooked 0.5s ease-in-out forwards;
            }
            
            .transition-from-booked {
                animation: fromBooked 0.5s ease-in-out forwards;
            }
            
            @keyframes toBooked {
                0% {
                    background: var(--gradient-primary);
                    transform: translateY(-3px);
                }
                50% {
                    transform: scale(1.1) translateY(0);
                }
                100% {
                    background: linear-gradient(135deg, var(--danger-color), #e05252);
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes fromBooked {
                0% {
                    background: linear-gradient(135deg, var(--danger-color), #e05252);
                }
                50% {
                    transform: scale(1.1);
                }
                100% {
                    background: var(--gradient-secondary);
                    transform: scale(1);
                }
            }
            
            /* Map marker styles */
            .bus-marker-icon {
                filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.3));
            }
            
            .bus-icon {
                width: 40px;
                height: 40px;
                background: var(--primary-color);
                border-radius: 50%;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 0 0 5px rgba(26, 115, 232, 0.3);
                animation: pulse 2s infinite;
            }
            
            .passenger-icon {
                width: 30px;
                height: 30px;
                background: #5e17eb;
                border-radius: 50%;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 0 0 3px rgba(94, 23, 235, 0.3);
            }
            
            /* Map loading styles */
            .map-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                padding: 30px;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 12px;
            }
            
            .map-loading-spinner {
                width: 50px;
                height: 50px;
                border: 5px solid var(--primary-light);
                border-top-color: var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            .map-loading-text {
                font-size: 1.1rem;
                color: var(--primary-color);
                font-weight: 500;
            }
            
            /* Fade animations */
            .fade-in {
                animation: fadeIn 0.3s forwards;
            }
            
            .fade-out {
                animation: fadeOut 0.3s forwards;
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            
            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
            
            /* Live indicator styles */
            .live-badge {
                display: inline-flex;
                align-items: center;
                background: var(--secondary-light);
                color: var(--secondary-color);
                font-size: 0.7rem;
                font-weight: bold;
                padding: 3px 8px;
                border-radius: 12px;
                margin-left: 8px;
                vertical-align: middle;
            }
            
            .live-dot {
                width: 8px;
                height: 8px;
                background-color: var(--secondary-color);
                border-radius: 50%;
                margin-right: 5px;
                animation: pulse 1.5s infinite;
            }
            
            .eta-badge {
                display: inline-flex;
                align-items: center;
                background: var(--primary-light);
                color: var(--primary-color);
                font-size: 0.9rem;
                font-weight: 500;
                padding: 5px 10px;
                border-radius: 12px;
            }
            
            .eta-badge i {
                margin-right: 5px;
            }
            
            .eta-badge.updating {
                background: rgba(94, 23, 235, 0.1);
                color: #5e17eb;
            }
            
            /* Dots animation for "calculating" text */
            .calculating {
                display: inline-flex;
                align-items: center;
            }
            
            .dot-animation {
                animation: dotAnimation 1.4s infinite;
                opacity: 0;
            }
            
            .dot-animation:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .dot-animation:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes dotAnimation {
                0% {
                    opacity: 0;
                }
                50% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Weather, Clock, and Traffic Widget Functions
    function initWidgets() {
        // Get DOM elements
        const weatherBtn = document.getElementById('weather-btn');
        const clockBtn = document.getElementById('clock-btn');
        const trafficBtn = document.getElementById('traffic-btn');
        const weatherExpanded = document.getElementById('weather-expanded');
        const clockExpanded = document.getElementById('clock-expanded');
        const trafficExpanded = document.getElementById('traffic-expanded');
        const routePlannerBtn = document.getElementById('route-planner-btn');
        const routePlannerModal = document.getElementById('route-planner-modal');
        
        // Add toggle functionality to widget buttons
        weatherBtn.addEventListener('click', function() {
            toggleWidget(weatherExpanded);
            closeOtherWidgets(weatherExpanded);
            if (weatherExpanded.classList.contains('active')) {
                fetchWeatherData();
            }
        });
        
        clockBtn.addEventListener('click', function() {
            toggleWidget(clockExpanded);
            closeOtherWidgets(clockExpanded);
        });
        
        trafficBtn.addEventListener('click', function() {
            toggleWidget(trafficExpanded);
            closeOtherWidgets(trafficExpanded);
            if (trafficExpanded.classList.contains('active')) {
                fetchTrafficData();
            }
        });
        
        // Open route planner modal
        routePlannerBtn.addEventListener('click', function() {
            routePlannerModal.style.display = 'block';
            setTimeout(() => {
                routePlannerModal.classList.add('modal-active');
            }, 10);
            
            // Hide traffic expanded
            trafficExpanded.classList.remove('active');
            
            // Initialize the custom date field
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            document.getElementById('custom-date').value = formattedDate;
            
            // Setup current location detection for route planner
            setupRoutePlannerLocation();
        });
        
        // Setup departure time selector
        const departureSelect = document.getElementById('departure-time');
        const customTimeContainer = document.getElementById('custom-time-container');
        
        departureSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customTimeContainer.style.display = 'block';
            } else {
                customTimeContainer.style.display = 'none';
            }
        });
        
        // Setup find route button
        const findRouteBtn = document.getElementById('find-route-btn');
        const openWazeBtn = document.getElementById('open-waze-btn');
        
        findRouteBtn.addEventListener('click', function() {
            findRoute();
        });
        
        openWazeBtn.addEventListener('click', function() {
            openInWaze();
        });
        
        // Setup select bus stop button
        const selectBusStopBtn = document.getElementById('select-bus-stop');
        selectBusStopBtn.addEventListener('click', function() {
            // Simulated bus stop locations
            const busStops = [
                { name: "Downtown Terminal", address: "123 Main St" },
                { name: "Uptown Station", address: "456 Oak Ave" },
                { name: "Westside Stop", address: "789 Pine Blvd" },
                { name: "Eastview Center", address: "101 Maple Rd" }
            ];
            
            // Create a simple dropdown/select for bus stops
            let busStopOptions = '<div style="padding: 10px; background: #f1f5f9; border-radius: 8px; margin-top: 10px;">';
            busStopOptions += '<p style="margin-bottom: 8px; font-weight: 500;">Select a Bus Stop:</p>';
            
            busStops.forEach((stop, index) => {
                busStopOptions += `
                    <div class="route-option" onclick="document.getElementById('route-to').value='${stop.name}, ${stop.address}'">
                        <div class="route-option-header">
                            <span class="route-time">${stop.name}</span>
                        </div>
                        <div class="route-details">${stop.address}</div>
                    </div>
                `;
            });
            
            busStopOptions += '</div>';
            
            // Show options under the input
            const routeToInput = document.getElementById('route-to');
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'bus-stop-options';
            optionsContainer.innerHTML = busStopOptions;
            
            // Remove existing options if any
            const existingOptions = document.getElementById('bus-stop-options');
            if (existingOptions) {
                existingOptions.remove();
            }
            
            // Add new options
            routeToInput.parentNode.appendChild(optionsContainer);
            
            // Add click event to document to close options when clicking outside
            document.addEventListener('click', function closeOptions(e) {
                if (!optionsContainer.contains(e.target) && e.target !== selectBusStopBtn) {
                    optionsContainer.remove();
                    document.removeEventListener('click', closeOptions);
                }
            });
        });
        
        // Add click outside to close expanded widgets
        document.addEventListener('click', function(event) {
            const widgets = [weatherExpanded, clockExpanded, trafficExpanded];
            const buttons = [weatherBtn, clockBtn, trafficBtn];
            
            if (!buttons.some(btn => btn.contains(event.target)) && 
                !widgets.some(widget => widget.contains(event.target))) {
                widgets.forEach(widget => widget.classList.remove('active'));
            }
        });
    }
    
    // Close other widgets when one is opened
    function closeOtherWidgets(currentWidget) {
        const widgets = [
            document.getElementById('weather-expanded'),
            document.getElementById('clock-expanded'),
            document.getElementById('traffic-expanded')
        ];
        
        widgets.forEach(widget => {
            if (widget !== currentWidget) {
                widget.classList.remove('active');
            }
        });
    }
    
    // Toggle widget expanded state
    function toggleWidget(widget) {
        widget.classList.toggle('active');
    }
    
    // Initialize clock widget and keep it updated
    function initClock() {
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    // Update the clock display
    function updateClock() {
        const now = new Date();
        const timeElem = document.querySelector('.current-time');
        const dateElem = document.querySelector('.current-date');
        
        // Format time: HH:MM:SS
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        timeElem.textContent = `${hours}:${minutes}:${seconds}`;
        
        // Format date: Month DD, YYYY
        const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
        dateElem.textContent = now.toLocaleDateString('en-US', options);
        
        // Add pulse animation on minute change
        if (seconds === '00') {
            timeElem.classList.add('pulse-once');
            setTimeout(() => {
                timeElem.classList.remove('pulse-once');
            }, 500);
        }
    }
    
    // Fetch weather data
    function fetchWeatherData() {
        const weatherIcon = document.querySelector('.weather-icon');
        const weatherTemp = document.querySelector('.weather-temp');
        const weatherDesc = document.querySelector('.weather-desc');
        const weatherLocation = document.querySelector('.weather-location');
        
        // Show loading state
        weatherIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        weatherTemp.textContent = 'Loading...';
        weatherDesc.textContent = 'Fetching weather data';
        weatherLocation.textContent = 'Please wait';
        
        // In a real app, you would use a weather API with your API key
        // For this demo, we'll use a simulated response
        setTimeout(() => {
            // Get location first (if available)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    // Success callback
                    (position) => {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        
                        // Simulate fetching weather data with the coordinates
                        simulateWeatherData(latitude, longitude);
                    },
                    // Error callback
                    (error) => {
                        console.error("Error getting location for weather:", error);
                        // Fallback to default weather data
                        simulateWeatherData();
                    }
                );
            } else {
                // Fallback to default weather data
                simulateWeatherData();
            }
        }, 1000);
    }
    
    // Simulate weather data (in a real app, this would be an API call)
    function simulateWeatherData(latitude = null, longitude = null) {
        // Current date for seasonal variations
        const now = new Date();
        const month = now.getMonth(); // 0-11
        
        // Simulate different weather based on month
        let weatherData;
        
        // Simulate location-based weather if coordinates provided
        if (latitude && longitude) {
            // Here we would normally make an API call with the coordinates
            // For this demo, we'll use random weather variations
            const weatherTypes = [
                { temp: '28°C', desc: 'sunny', icon: 'sun' },
                { temp: '24°C', desc: 'partly cloudy', icon: 'cloud-sun' },
                { temp: '18°C', desc: 'cloudy', icon: 'cloud' },
                { temp: '15°C', desc: 'light rain', icon: 'cloud-rain' }
            ];
            
            weatherData = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
            
            // Simulate getting city name from coordinates (reverse geocoding)
            reverseGeocode(latitude, longitude, (locationName) => {
                document.querySelector('.weather-location').textContent = locationName;
            });
        } else {
            // Seasonal variations if no location provided
            if (month >= 2 && month <= 4) { // Spring
                weatherData = { temp: '18°C', desc: 'partly cloudy', icon: 'cloud-sun' };
            } else if (month >= 5 && month <= 7) { // Summer
                weatherData = { temp: '29°C', desc: 'sunny', icon: 'sun' };
            } else if (month >= 8 && month <= 10) { // Fall
                weatherData = { temp: '15°C', desc: 'windy', icon: 'wind' };
            } else { // Winter
                weatherData = { temp: '5°C', desc: 'light snow', icon: 'snowflake' };
            }
            
            document.querySelector('.weather-location').textContent = 'Default Location';
        }
        
        // Update weather UI
        document.querySelector('.weather-icon').innerHTML = `<i class="fas fa-${weatherData.icon}"></i>`;
        document.querySelector('.weather-temp').textContent = weatherData.temp;
        document.querySelector('.weather-desc').textContent = weatherData.desc;
        
        // Add animation
        document.querySelector('.weather-temp').classList.add('pulse-once');
        setTimeout(() => {
            document.querySelector('.weather-temp').classList.remove('pulse-once');
        }, 500);
        
        // Show weather updated toast
        showToast('Weather Updated', 'Current weather conditions loaded successfully', 'info');
    }
    
    // Simplified reverse geocode function 
    function reverseGeocode(latitude, longitude, callback) {
        // In a real app, this would use a geocoding API
        // For this demo, we'll use a simulated response
        setTimeout(() => {
            // Create a simple location based on coordinates
            const locationPrefix = latitude > 0 ? 'North' : 'South';
            const locationSuffix = longitude > 0 ? 'East' : 'West';
            const locationName = `${locationPrefix} ${Math.abs(latitude).toFixed(2)}, ${locationSuffix} ${Math.abs(longitude).toFixed(2)}`;
            
            callback(locationName);
        }, 500);
    }
    
    // Fetch traffic data
    function fetchTrafficData() {
        const trafficLevel = document.querySelector('.traffic-level');
        const trafficBar = document.querySelector('.traffic-bar');
        
        // Show loading state
        trafficLevel.textContent = 'Analyzing traffic conditions...';
        trafficBar.style.width = '0%';
        trafficBar.className = 'traffic-bar';
        
        // In a real app, you would use a traffic API
        // For this demo, we'll use a simulated response
        setTimeout(() => {
            // Simulate random traffic conditions
            const trafficConditions = [
                { level: 'Light traffic', percentage: 30, class: 'traffic-low' },
                { level: 'Moderate traffic', percentage: 60, class: 'traffic-medium' },
                { level: 'Heavy traffic', percentage: 85, class: 'traffic-high' }
            ];
            
            const traffic = trafficConditions[Math.floor(Math.random() * trafficConditions.length)];
            
            // Animate traffic bar
            trafficLevel.textContent = traffic.level;
            trafficBar.classList.add(traffic.class);
            
            // Animate width change
            setTimeout(() => {
                trafficBar.style.width = `${traffic.percentage}%`;
            }, 100);
            
            // Show traffic updated toast
            showToast('Traffic Updated', 'Current traffic conditions loaded successfully', 'info');
        }, 1500);
    }
    
    // Setup route planner location detection
    function setupRoutePlannerLocation() {
        const detectStartLocationBtn = document.getElementById('detect-start-location');
        const routeFromInput = document.getElementById('route-from');
        
        detectStartLocationBtn.addEventListener('click', function() {
            // Show loading state
            detectStartLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            routeFromInput.value = 'Detecting your location...';
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    // Success callback
                    (position) => {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        
                        // Simulate getting address from coordinates
                        setTimeout(() => {
                            routeFromInput.value = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
                            detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                            showToast('Location Detected', 'Your current location has been set as the starting point', 'success');
                        }, 1000);
                    },
                    // Error callback
                    (error) => {
                        routeFromInput.value = '';
                        detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                        showToast('Location Error', getLocationErrorMessage(error), 'error');
                    }
                );
            } else {
                routeFromInput.value = '';
                detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                showToast('Location Error', 'Geolocation is not supported by this browser', 'error');
            }
        });
    }
    
    // Find route using Waze (simulated)
    function findRoute() {
        const routeFrom = document.getElementById('route-from').value;
        const routeTo = document.getElementById('route-to').value;
        const departureTime = document.getElementById('departure-time').value;
        const routeLoading = document.querySelector('.route-loading');
        const routeOptions = document.querySelector('.route-options');
        const openWazeBtn = document.getElementById('open-waze-btn');
        
        // Validate inputs
        if (!routeFrom || !routeTo) {
            showToast('Input Required', 'Please enter both starting point and destination', 'warning');
            return;
        }
        
        // Show loading state
        routeLoading.style.display = 'block';
        routeOptions.style.display = 'none';
        openWazeBtn.disabled = true;
        
        // Simulate API call to Waze
        setTimeout(() => {
            // Hide loading
            routeLoading.style.display = 'none';
            routeOptions.style.display = 'block';
            
            // Generate simulated routes
            const routes = [
                {
                    duration: '25 min',
                    distance: '8.5 km',
                    traffic: 'light',
                    details: 'Via Highway 101, Main St'
                },
                {
                    duration: '32 min',
                    distance: '7.2 km',
                    traffic: 'moderate',
                    details: 'Via Riverside Dr, Downtown'
                },
                {
                    duration: '28 min',
                    distance: '9.1 km',
                    traffic: 'heavy',
                    details: 'Via Parkway, Oak St'
                }
            ];
            
            // Build route options HTML
            let routeHTML = '';
            
            routes.forEach((route, index) => {
                const trafficClass = route.traffic === 'light' ? 'traffic-low' : 
                                     route.traffic === 'moderate' ? 'traffic-medium' : 'traffic-high';
                
                routeHTML += `
                    <div class="route-option ${index === 0 ? 'selected' : ''}" data-route-index="${index}">
                        <div class="route-option-header">
                            <span class="route-time">${route.duration}</span>
                            <span class="route-distance">${route.distance}</span>
                        </div>
                        <div class="route-details">
                            <span class="route-traffic-indicator ${trafficClass}"></span>
                            ${route.traffic.charAt(0).toUpperCase() + route.traffic.slice(1)} traffic · ${route.details}
                        </div>
                    </div>
                `;
            });
            
            routeOptions.innerHTML = routeHTML;
            
            // Add click handlers to route options
            document.querySelectorAll('.route-option').forEach(option => {
                option.addEventListener('click', function() {
                    // Deselect all options
                    document.querySelectorAll('.route-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    // Select clicked option
                    this.classList.add('selected');
                });
            });
            
            // Enable Waze button
            openWazeBtn.disabled = false;
            
            // Show success message
            showToast('Routes Found', 'Multiple routes to your destination have been found', 'success');
        }, 2000);
    }
    
    // Open route in Waze
    function openInWaze() {
        const routeFrom = encodeURIComponent(document.getElementById('route-from').value);
        const routeTo = encodeURIComponent(document.getElementById('route-to').value);
        
        // Validate inputs
        if (!routeFrom || !routeTo) {
            showToast('Input Required', 'Please enter both starting point and destination', 'warning');
            return;
        }
        
        // Build Waze URL (in a real app, you might use coordinates for more accurate routing)
        const wazeUrl = `https://waze.com/ul?q=${routeTo}&navigate=yes`;
        
        // Show toast before opening
        showToast('Opening Waze', 'Redirecting to Waze for navigation...', 'info');
        
        // Open in new window/tab
        setTimeout(() => {
            window.open(wazeUrl, '_blank');
        }, 1000);
    }
    
    // Initialize persistent widgets (always visible)
    function initPersistentWidgets() {
        // Initialize traffic button to show toast notifications
        const trafficBtn = document.getElementById('traffic-btn');
        trafficBtn.addEventListener('click', function() {
            // Show a loading toast
            showToast('Traffic Update', 'Checking current traffic conditions...', 'info');
            
            // Simulate fetching traffic data with a short delay
            setTimeout(() => {
                // Generate random traffic conditions
                const trafficConditions = [
                    { level: 'Light traffic in your area', icon: 'fas fa-check-circle', type: 'success' },
                    { level: 'Moderate traffic on main routes', icon: 'fas fa-exclamation-triangle', type: 'warning' },
                    { level: 'Heavy traffic reported nearby', icon: 'fas fa-exclamation-circle', type: 'error' }
                ];
                
                const traffic = trafficConditions[Math.floor(Math.random() * trafficConditions.length)];
                
                // Show traffic condition as a toast notification
                showToast('Traffic Alert', traffic.level, traffic.type);
            }, 1500);
        });
        
        // Initialize the route planner button
        const routePlannerBtn = document.getElementById('route-planner-btn');
        const routePlannerModal = document.getElementById('route-planner-modal');
        
        routePlannerBtn.addEventListener('click', function() {
            routePlannerModal.style.display = 'block';
            setTimeout(() => {
                routePlannerModal.classList.add('modal-active');
            }, 10);
            
            // Initialize the custom date field
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            document.getElementById('custom-date').value = formattedDate;
            
            // Setup current location detection for route planner
            setupRoutePlannerLocation();
        });
        
        // Load initial weather data
        loadWeatherData();
    }
    
    // Load weather data for the persistent weather widget
    function loadWeatherData() {
        const weatherIcon = document.querySelector('#persistent-weather-widget .weather-icon');
        const weatherTemp = document.querySelector('#persistent-weather-widget .weather-temp');
        const weatherDesc = document.querySelector('#persistent-weather-widget .weather-desc');
        
        // Show loading state
        weatherIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        weatherTemp.textContent = 'Loading...';
        weatherDesc.textContent = 'Fetching weather';
        
        // In a real app, you would use a weather API with your API key
        // For this demo, we'll use a simulated response
        setTimeout(() => {
            // Get location first (if available)
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    // Success callback
                    (position) => {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        
                        // Simulate fetching weather data with the coordinates
                        updatePersistentWeather(latitude, longitude);
                    },
                    // Error callback
                    (error) => {
                        console.error("Error getting location for weather:", error);
                        // Fallback to default weather data
                        updatePersistentWeather();
                    }
                );
            } else {
                // Fallback to default weather data
                updatePersistentWeather();
            }
        }, 1000);
        
        // Update weather every 30 minutes
        setInterval(loadWeatherData, 30 * 60 * 1000);
    }
    
    // Update the persistent weather widget
    function updatePersistentWeather(latitude = null, longitude = null) {
        // Current date for seasonal variations
        const now = new Date();
        const month = now.getMonth(); // 0-11
        const weatherIcon = document.querySelector('#persistent-weather-widget .weather-icon');
        const weatherTemp = document.querySelector('#persistent-weather-widget .weather-temp');
        const weatherDesc = document.querySelector('#persistent-weather-widget .weather-desc');
        
        // Simulate different weather based on month
        let weatherData;
        
        // Simulate location-based weather if coordinates provided
        if (latitude && longitude) {
            // Here we would normally make an API call with the coordinates
            // For this demo, we'll use random weather variations
            const weatherTypes = [
                { temp: '28°C', desc: 'Sunny', icon: 'sun' },
                { temp: '24°C', desc: 'Partly cloudy', icon: 'cloud-sun' },
                { temp: '18°C', desc: 'Cloudy', icon: 'cloud' },
                { temp: '15°C', desc: 'Light rain', icon: 'cloud-rain' }
            ];
            
            weatherData = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        } else {
            // Seasonal variations if no location provided
            if (month >= 2 && month <= 4) { // Spring
                weatherData = { temp: '18°C', desc: 'Partly cloudy', icon: 'cloud-sun' };
            } else if (month >= 5 && month <= 7) { // Summer
                weatherData = { temp: '29°C', desc: 'Sunny', icon: 'sun' };
            } else if (month >= 8 && month <= 10) { // Fall
                weatherData = { temp: '15°C', desc: 'Windy', icon: 'wind' };
            } else { // Winter
                weatherData = { temp: '5°C', desc: 'Light snow', icon: 'snowflake' };
            }
        }
        
        // Update weather UI with animation for text only, not for the icon
        weatherTemp.classList.add('fade-out');
        weatherDesc.classList.add('fade-out');
        
        setTimeout(() => {
            // Update icon without any animation or spinning class
            weatherIcon.innerHTML = `<i class="fas fa-${weatherData.icon}" style="animation: none;"></i>`;
            
            weatherTemp.textContent = weatherData.temp;
            weatherDesc.textContent = weatherData.desc;
            
            weatherTemp.classList.remove('fade-out');
            weatherDesc.classList.remove('fade-out');
            
            weatherTemp.classList.add('fade-in');
            weatherDesc.classList.add('fade-in');
            
            setTimeout(() => {
                weatherTemp.classList.remove('fade-in');
                weatherDesc.classList.remove('fade-in');
            }, 300);
        }, 300);
    }
    
    // Update the clock display for the persistent clock widget
    function updateClock() {
        const now = new Date();
        const timeElems = document.querySelectorAll('.current-time');
        const dateElems = document.querySelectorAll('.current-date');
        
        // Format time: HH:MM:SS
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        // Format date: Month DD, YYYY
        const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
        const formattedDate = now.toLocaleDateString('en-US', options);
        
        // Update all clock instances
        timeElems.forEach(timeElem => {
            timeElem.textContent = `${hours}:${minutes}:${seconds}`;
            
            // Add pulse animation on minute change
            if (seconds === '00') {
                timeElem.classList.add('pulse-once');
                setTimeout(() => {
                    timeElem.classList.remove('pulse-once');
                }, 500);
            }
        });
        
        dateElems.forEach(dateElem => {
            dateElem.textContent = formattedDate;
        });
    }
});