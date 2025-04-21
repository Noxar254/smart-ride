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
    const routePlannerModal = document.getElementById('route-planner-modal');
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
    
    // Route planner elements
    const routePlannerBtn = document.getElementById('route-planner-btn');
    const detectStartLocationBtn = document.getElementById('detect-start-location');
    const selectBusStopBtn = document.getElementById('select-bus-stop');
    const routeFromInput = document.getElementById('route-from');
    const routeToInput = document.getElementById('route-to');
    const departureTimeSelect = document.getElementById('departure-time');
    const customTimeContainer = document.getElementById('custom-time-container');
    const customTimeInput = document.getElementById('custom-time');
    const customDateInput = document.getElementById('custom-date');
    const findRouteBtn = document.getElementById('find-route-btn');
    const openWazeBtn = document.getElementById('open-waze-btn');
    const routeResults = document.getElementById('route-results');
    const routeLoading = document.querySelector('.route-loading');
    const routeOptions = document.querySelector('.route-options');
    
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
    let nearbyBusStops = [];
    let selectedRoute = null;
    
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
        
        // Auto-close after 1 second (changed from 5 seconds)
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 1000);
    }
    
    // Location detection with improved permission handling
    detectLocationBtn.addEventListener('click', function() {
        // Use our improved location permission system
        requestLocationPermission(
            // Success callback - only called when permission is granted
            () => {
                locationStatus.textContent = "Detecting location...";
                locationStatus.className = "detecting";
                
                // Create a progress indicator
                const progressIndicator = document.createElement('div');
                progressIndicator.className = 'location-progress';
                locationStatus.appendChild(progressIndicator);
                
                // Detect passenger location for sharing with the bus
                detectPassengerLocation();
            }, 
            // Error callback
            (errorMsg) => {
                locationStatus.textContent = errorMsg;
                locationStatus.className = "error";
                showToast('Location Error', errorMsg, 'error');
            },
            // Purpose text - explain why we need location
            "find the closest bus stop to you and provide accurate pickup information"
        );
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
            
            // Call the backend API to start bus tracking
            fetch('/api/bus/start-tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bus_id: 'KDQ 144F'
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Started bus tracking:', data);
                
                // Start polling for bus location updates
                startBusLocationPolling();
                
                // Notification after successful start
                showToast('Tracking Active', 'Live bus location tracking is now active.', 'success');
            })
            .catch(error => {
                console.error('Error starting tracking:', error);
                showToast('Tracking Error', 'Failed to start bus tracking. Please try again.', 'error');
                stopLiveTracking();
            });
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
        
        // Call the backend API to stop bus tracking
        fetch('/api/bus/stop-tracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bus_id: 'KDQ 144F'
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Stopped bus tracking:', data);
        })
        .catch(error => {
            console.error('Error stopping tracking:', error);
            showToast('Error', 'Failed to stop tracking on the server, but local tracking has been disabled.', 'warning');
        })
        .finally(() => {
            // Stop polling for updates
            if (window.busLocationInterval) {
                clearInterval(window.busLocationInterval);
                window.busLocationInterval = null;
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
            
            // Remove path if it exists
            if (routePath && window.busMap) {
                window.busMap.removeLayer(routePath);
                routePath = null;
            }
            
            // Remove passenger markers
            removeAllPassengerMarkers();
            
            // Notification after successful stop
            showToast('Tracking Stopped', 'Live bus location tracking has been stopped.', 'warning');
        });
    }
    
    // Start polling for bus location updates
    function startBusLocationPolling() {
        // First update immediately
        updateBusLocationFromServer();
        
        // Then set up regular polling
        if (window.busLocationInterval) {
            clearInterval(window.busLocationInterval);
        }
        
        window.busLocationInterval = setInterval(updateBusLocationFromServer, 2000); // Poll every 2 seconds
        
        // Also fetch and display the route information
        fetchRouteFromServer();
    }
    
    // Update bus location from server data
    function updateBusLocationFromServer() {
        fetch('/api/bus/location?bus_id=KDQ 144F')
            .then(response => response.json())
            .then(data => {
                // Update the bus position on the map
                const latitude = data.current_position[0];
                const longitude = data.current_position[1];
                const speed = data.speed;
                const heading = data.heading;
                const eta = data.eta;
                
                // Update the bus UI elements
                updateBusPosition({
                    coords: {
                        latitude,
                        longitude,
                        accuracy: 10, // Assuming high accuracy
                        speed,
                        heading
                    }
                });
                
                // Update passenger markers if present
                if (data.nearby_passengers && data.nearby_passengers.length > 0) {
                    updatePassengerMarkers(data.nearby_passengers);

                    // Update passenger count display with animation
                    const passengerCountElement = document.getElementById('passenger-count');
                    if (passengerCountElement) {
                        const oldCount = parseInt(passengerCountElement.textContent) || 0;
                        const newCount = data.nearby_passengers.length;

                        // Update the count
                        passengerCountElement.textContent = newCount;

                        // Add animation if count changed
                        if (oldCount !== newCount) {
                            passengerCountElement.classList.add('pulse-once');
                            setTimeout(() => {
                                passengerCountElement.classList.remove('pulse-once');
                            }, 500);

                            // Show toast notification if new passengers appeared
                            if (newCount > oldCount) {
                                showToast('New Passengers', `${newCount - oldCount} new passenger(s) waiting for pickup`, 'info');
                            }
                        }
                    }
                } else {
                    // If no passengers, ensure count is set to 0
                    const passengerCountElement = document.getElementById('passenger-count');
                    if (passengerCountElement) {
                        passengerCountElement.textContent = '0';
                    }
                }

                // Update ETA display
                const etaElement = document.getElementById('eta');
                if (etaElement && eta) {
                    etaElement.innerHTML = `
                        <span class="eta-badge high">
                            <i class="fas fa-clock"></i> ${eta}
                        </span>
                    `;
                }
                
                // Update any UI elements that show the bus status
                updateBusStatusInfo(data);
            })
            .catch(error => {
                console.error('Error fetching bus location:', error);
                if (liveTrackingEnabled) {
                    showToast('Connection Error', 'Unable to fetch bus location. Will retry...', 'error');
                }
            });
    }
    
    // Update information about bus status in tracking panel
    function updateBusStatusInfo(busData) {
        const busInfoContainer = document.getElementById('bus-info-container');
        if (!busInfoContainer) return;
        
        // Create the container if it doesn't exist
        if (busInfoContainer.children.length === 0) {
            busInfoContainer.innerHTML = `
                <div class="bus-info-panel">
                    <div class="bus-info-header">
                        <h3>Bus KDQ 144F <span class="live-tracking-indicator"></span></h3>
                    </div>
                    <div class="bus-info-details">
                        <div class="bus-info-row">
                            <span class="bus-info-label">Speed:</span>
                            <span id="bus-speed" class="bus-info-value">0 km/h</span>
                        </div>
                        <div class="bus-info-row">
                            <span class="bus-info-label">Destination:</span>
                            <span id="bus-destination" class="bus-info-value">Loading...</span>
                        </div>
                        <div class="bus-info-row">
                            <span class="bus-info-label">Capacity:</span>
                            <span id="bus-capacity" class="bus-info-value">Loading...</span>
                        </div>
                        <div class="bus-info-row">
                            <span class="bus-info-label">Driver:</span>
                            <span id="bus-driver" class="bus-info-value">Loading...</span>
                        </div>
                        <div class="bus-info-row">
                            <span class="bus-info-label">Last Updated:</span>
                            <span id="bus-updated" class="bus-info-value">Just now</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update the values
        const speedElement = document.getElementById('bus-speed');
        const destinationElement = document.getElementById('bus-destination');
        const capacityElement = document.getElementById('bus-capacity');
        const driverElement = document.getElementById('bus-driver');
        const updatedElement = document.getElementById('bus-updated');
        
        if (speedElement) speedElement.textContent = `${Math.round(busData.speed)} km/h`;
        if (destinationElement) destinationElement.textContent = busData.destination || 'Unknown';
        if (capacityElement) capacityElement.textContent = busData.capacity ? `${busData.capacity} seats` : 'Unknown';
        if (driverElement) driverElement.textContent = busData.driver || 'Unknown';
        if (updatedElement) {
            updatedElement.textContent = 'Just now';
            startLastUpdatedTimer(updatedElement);
        }
        
        // Add animation to show fresh data
        const infoPanel = document.querySelector('.bus-info-panel');
        if (infoPanel) {
            infoPanel.classList.add('data-update');
            setTimeout(() => {
                infoPanel.classList.remove('data-update');
            }, 1000);
        }
    }
    
    // Start a timer to update the "last updated" time
    function startLastUpdatedTimer(element) {
        if (window.lastUpdatedTimer) {
            clearInterval(window.lastUpdatedTimer);
        }
        
        let seconds = 0;
        window.lastUpdatedTimer = setInterval(() => {
            seconds++;
            if (seconds < 60) {
                element.textContent = `${seconds} seconds ago`;
            } else {
                const minutes = Math.floor(seconds / 60);
                element.textContent = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            }
        }, 1000);
    }
    
    // Update passenger markers on the map
    function updatePassengerMarkers(passengers) {
        // Clear existing passenger markers
        if (window.passengerMarkers && window.passengerMarkers.length > 0) {
            window.passengerMarkers.forEach(marker => {
                marker.remove();
            });
            window.passengerMarkers = [];
        } else {
            window.passengerMarkers = [];
        }
        
        // Update passenger count
        document.getElementById('passenger-count').textContent = passengers.length;
        
        // Add new passenger markers
        passengers.forEach(passenger => {
            // Create a custom passenger icon
            const passengerIcon = L.divIcon({
                className: 'passenger-marker',
                html: '<i class="fas fa-user"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            const marker = L.marker([passenger.position[0], passenger.position[1]], {
                icon: passengerIcon
            }).addTo(map);
            
            marker.bindPopup(`<b>${passenger.name || 'Passenger'}</b><br>Distance: ${passenger.distance}km`);
            
            window.passengerMarkers.push(marker);
        });
    }
    
    // Remove all passenger markers from the map
    function removeAllPassengerMarkers() {
        if (window.busMap) {
            passengerMarkers.forEach(marker => {
                window.busMap.removeLayer(marker);
                if (marker.connectionLine) {
                    window.busMap.removeLayer(marker.connectionLine);
                }
            });
        }
        passengerMarkers = [];
    }
    
    // Update bus position on the map with enhanced visuals and accuracy
    function updateBusPosition(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy || 10; // Accuracy in meters
        const speed = position.coords.speed || 0; // Speed in km/h
        const heading = position.coords.heading || 0; // Heading in degrees
        
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
                
                busMarker = L.marker([latitude, longitude], {icon: busIcon, rotationAngle: heading}).addTo(window.busMap);
                busMarker.bindPopup(`
                    <strong>Smart Ride Bus #KDQ 144F</strong><br>
                    <span class='live-tag'>LIVE</span><br>
                    Speed: ${Math.round(speed)} km/h<br>
                    Accuracy: ${Math.round(accuracy)}m
                `).openPopup();
                
                window.busMap.setView([latitude, longitude], 15);
                
                // Add accuracy circle
                window.busAccuracyCircle = L.circle([latitude, longitude], {
                    radius: accuracy,
                    color: getAccuracyColor(accuracy),
                    fillColor: getAccuracyColor(accuracy),
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(window.busMap);
                
                // Add pulsing effect to the marker
                const busMarkerElement = busMarker.getElement();
                if (busMarkerElement) {
                    busMarkerElement.classList.add('pulsing-marker');
                }
                
                // Update accuracy indicator
                addMapAccuracyIndicator(getAccuracyLevel(accuracy));
                
                showToast('Bus Located', `Live bus position established (${Math.round(accuracy)}m accuracy)`, 'success');
                
                // Fetch route information from the server
                fetchRouteFromServer();
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
                    
                    // Rotate marker to match heading
                    if (L.marker.prototype.setRotationAngle) {
                        busMarker.setRotationAngle(heading);
                    }
                    
                    // Also animate the accuracy circle
                    if (window.busAccuracyCircle) {
                        animateAccuracyCircle(window.busAccuracyCircle, [latitude, longitude], 500);
                        
                        // Update accuracy circle radius and color based on position accuracy
                        window.busAccuracyCircle.setRadius(accuracy);
                        window.busAccuracyCircle.setStyle({
                            color: getAccuracyColor(accuracy),
                            fillColor: getAccuracyColor(accuracy)
                        });
                    }
                    
                    // Update marker popup to show current accuracy and speed
                    busMarker.setPopupContent(`
                        <strong>Smart Ride Bus #KDQ 144F</strong><br>
                        <span class='live-tag'>LIVE</span><br>
                        Speed: ${Math.round(speed)} km/h<br>
                        Accuracy: ${Math.round(accuracy)}m
                    `);
                    
                    // Update accuracy indicator
                    addMapAccuracyIndicator(getAccuracyLevel(accuracy));
                    
                    // Provide periodic updates about significant movements
                    if (distance > 100) {
                        showToast('Bus Moving', `Bus has moved ${Math.round(distance)}m at ${Math.round(speed)} km/h`, 'info');
                    }
                } else {
                    // Just update position without animation for tiny movements
                    busMarker.setLatLng(newLatLng);
                    if (window.busAccuracyCircle) {
                        window.busAccuracyCircle.setLatLng(newLatLng);
                    }
                }
            }
            
            // Update route path if we have previous positions
            updateRoutePath(latitude, longitude);
            
            // Update any passenger connection lines
            updatePassengerConnectionLines();
            
            // Update location display and ETA
            updateLocationDisplay(latitude, longitude, accuracy, speed);
        }
    }
    
    // Fetch route information from the server
    function fetchRouteFromServer() {
        fetch('/api/bus/route?bus_id=KDQ 144F')
            .then(response => response.json())
            .then(data => {
                if (data && data.route && window.busMap) {
                    // If there's an existing route path, remove it
                    if (routePath) {
                        window.busMap.removeLayer(routePath);
                    }
                    
                    // Create a path with the route geometry
                    routePath = L.geoJSON(data.route, {
                        style: {
                            color: '#1a73e8',
                            weight: 5,
                            opacity: 0.7,
                            lineCap: 'round',
                            lineJoin: 'round',
                            dashArray: '10, 10',
                            dashOffset: '0'
                        }
                    }).addTo(window.busMap);
                    
                    // Add animated dash effect to the path
                    animateRoutePath();
                    
                    // Update ETA display
                    const etaElement = document.getElementById('eta');
                    if (etaElement) {
                        etaElement.innerHTML = `
                            <span class="eta-badge high">
                                <i class="fas fa-clock"></i> ${data.eta}
                            </span>
                        `;
                    }
                    
                    showToast('Route Loaded', 'Bus route information loaded successfully', 'success');
                }
            })
            .catch(error => {
                console.error('Error fetching route:', error);
                showToast('Route Error', 'Could not load bus route information', 'error');
            });
    }
    
    // Update passenger connection lines when bus moves
    function updatePassengerConnectionLines() {
        if (!window.busMap || !busMarker) return;
        
        const busPosition = busMarker.getLatLng();
        
        passengerMarkers.forEach(marker => {
            if (marker.connectionLine) {
                const passengerPosition = marker.getLatLng();
                marker.connectionLine.setLatLngs([
                    [busPosition.lat, busPosition.lng],
                    [passengerPosition.lat, passengerPosition.lng]
                ]);
            }
        });
    }
    
    // Update passenger location with the server
    function updatePassengerLocation(passengerId, name, latitude, longitude) {
        fetch('/api/passenger/update-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                passenger_id: passengerId,
                name: name,
                latitude: latitude,
                longitude: longitude
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Updated passenger location:', data);
        })
        .catch(error => {
            console.error('Error updating passenger location:', error);
        });
    }
    
    // Detect and send passenger location
    function detectPassengerLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    userLatitude.value = position.coords.latitude;
                    userLongitude.value = position.coords.longitude;
                    
                    // Generate a unique ID for this passenger if not already created
                    if (!window.passengerId) {
                        window.passengerId = 'passenger_' + Date.now();
                    }
                    
                    // Get passenger name from the form if available
                    const nameField = document.getElementById('name');
                    const passengerName = nameField && nameField.value ? nameField.value : 'Anonymous Passenger';
                    
                    // Update passenger location with the server
                    updatePassengerLocation(
                        window.passengerId,
                        passengerName,
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    
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
                    
                    locationStatus.textContent = `Location detected (${accuracyMessage} accuracy: ~${accuracy}m)`;
                    locationStatus.className = accuracyClass;
                    
                    // Show success toast based on accuracy
                    if (accuracyClass === "success") {
                        showToast('Location Shared', 'Your location is now being shared with the bus driver.', 'success');
                    } else if (accuracyClass === "medium") {
                        showToast('Location Shared', 'Your location is being shared with medium accuracy.', 'info');
                    } else {
                        showToast('Location Shared', 'Your location is being shared with low accuracy.', 'warning');
                    }
                    
                    // Start continuous location updates for the passenger
                    startPassengerLocationTracking();
                    
                    // Enhanced reverse geocoding with error handling and more precise results
                    reverseGeocode(position.coords.latitude, position.coords.longitude);
                },
                // Error callback
                function(error) {
                    locationStatus.textContent = "Error: " + getLocationErrorMessage(error);
                    locationStatus.className = "error";
                    userLatitude.value = "";
                    userLongitude.value = "";
                    
                    showToast('Location Error', getLocationErrorMessage(error), 'error');
                },
                // Options - adjust for better accuracy
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        } else {
            locationStatus.textContent = "Geolocation is not supported by this browser";
            locationStatus.className = "error";
            showToast('Location Error', 'Geolocation is not supported by this browser.', 'error');
        }
    }
    
    // Start continuous location tracking for passengers
    function startPassengerLocationTracking() {
        // Stop any existing tracking
        if (window.passengerWatchId) {
            navigator.geolocation.clearWatch(window.passengerWatchId);
        }
        
        // Generate a unique ID for this passenger if not already created
        if (!window.passengerId) {
            window.passengerId = 'passenger_' + Date.now();
        }
        
        // Get passenger name from the form if available
        const nameField = document.getElementById('name');
        const getPassengerName = () => nameField && nameField.value ? nameField.value : 'Anonymous Passenger';
        
        // Start watching position
        window.passengerWatchId = navigator.geolocation.watchPosition(
            // Success callback
            function(position) {
                // Update UI if inputs exist
                if (userLatitude && userLongitude) {
                    userLatitude.value = position.coords.latitude;
                    userLongitude.value = position.coords.longitude;
                }
                
                // Update passenger location with the server
                updatePassengerLocation(
                    window.passengerId,
                    getPassengerName(),
                    position.coords.latitude,
                    position.coords.longitude
                );
            },
            // Error callback
            function(error) {
                console.error("Error tracking passenger location:", error);
                
                if (locationStatus) {
                    locationStatus.textContent = "Error: " + getLocationErrorMessage(error);
                    locationStatus.className = "error";
                }
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000  // Accept positions up to 30 seconds old
            }
        );
        
        // Add a visual indicator that location is being shared
        if (locationStatus) {
            const sharingIndicator = document.createElement('span');
            sharingIndicator.className = 'location-sharing-indicator';
            sharingIndicator.innerHTML = ' <i class="fas fa-broadcast-tower"></i> Sharing';
            
            // If there's not already a sharing indicator
            if (!locationStatus.querySelector('.location-sharing-indicator')) {
                locationStatus.appendChild(sharingIndicator);
            }
        }
        
        // Show notification that location sharing is active
        showToast('Location Sharing', 'Your location is now being continuously shared with the driver', 'info');
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
    
    // Animate accuracy circle
    function animateAccuracyCircle(circle, newCenter, duration) {
        const oldCenter = circle.getLatLng();
        let start = Date.now();
        
        function frame() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Calculate intermediate position
            const lat = oldCenter.lat + (newCenter[0] - oldCenter.lat) * progress;
            const lng = oldCenter.lng + (newCenter[1] - oldCenter.lng) * progress;
            
            // Update circle position
            circle.setLatLng([lat, lng]);
            
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
    function updateLocationDisplay(latitude, longitude, accuracy, speed) {
        // Get accuracy level
        const accuracyLevel = getAccuracyLevel(accuracy);
        
        // In a real app, this would use a geocoding service
        const currentLocationElement = document.getElementById('current-location');
        currentLocationElement.innerHTML = `
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)} 
            <span class="accuracy-badge ${accuracyLevel}">
                ${accuracyLevel.charAt(0).toUpperCase() + accuracyLevel.slice(1)} Accuracy (${Math.round(accuracy)}m)
            </span>
        `;
        
        // Add map accuracy indicator or update it
        addMapAccuracyIndicator(accuracyLevel);
        
        // Simulate ETA calculation with animated progress
        const etaElement = document.getElementById('eta');
        etaElement.innerHTML = `
            <span class="calculating">
                Calculating based on ${accuracyLevel} accuracy data
                <span class="dot-animation">.</span>
                <span class="dot-animation">.</span>
                <span class="dot-animation">.</span>
            </span>
        `;
        
        // Simulate a more sophisticated ETA calculation after a delay
        setTimeout(() => {
            // In a real app, this would be calculated based on route, traffic, etc.
            // Higher accuracy would likely result in more precise ETAs
            let etaMinutes = 12;
            let etaConfidence = "";
            
            if (accuracyLevel === "high") {
                etaMinutes = 12;
                etaConfidence = "± 1 min";
            } else if (accuracyLevel === "medium") {
                etaMinutes = 12;
                etaConfidence = "± 3 min";
            } else {
                etaMinutes = 12;
                etaConfidence = "± 5 min";
            }
            
            etaElement.innerHTML = `
                <span class="eta-badge ${accuracyLevel}">
                    <i class="fas fa-clock"></i> ${etaMinutes} minutes <small>${etaConfidence}</small>
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
    
    // Initialize map for bus tracking with enhanced visuals and accuracy
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
                    <div class="map-loading-text">Loading high accuracy map...</div>
                </div>
            `;
            
            // Create map with a slight delay for a smoother transition
            setTimeout(() => {
                // Create map centered on Nairobi, Kenya (instead of New York)
                window.busMap = L.map('map', {
                    zoomControl: false,  // We'll add it in a better position
                    attributionControl: false,  // We'll add a custom attribution
                    maxZoom: 19, // Increased max zoom for better accuracy
                    preferCanvas: true // Better performance for moving markers
                }).setView([-1.2864, 36.8172], 15); // Nairobi, Kenya coordinates
                
                // Add custom-styled zoom control
                L.control.zoom({
                    position: 'bottomright'
                }).addTo(window.busMap);
                
                // Add custom attribution
                L.control.attribution({
                    position: 'bottomleft',
                    prefix: 'Smart Ride &copy; ' + new Date().getFullYear()
                }).addAttribution('Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors').addTo(window.busMap);
                
                // Add a high-detail tile layer for better accuracy
                L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
                }).addTo(window.busMap);

                // Add satellite toggle button
                addMapSatelliteToggle();
                
                // Add accuracy indicator
                addMapAccuracyIndicator("high");
                
                // Add map controls for accuracy adjustment
                addMapControls();
                
                // Add a custom styled marker for the bus
                const busIcon = L.divIcon({
                    className: 'bus-marker-icon',
                    html: '<div class="bus-icon"><i class="fas fa-bus"></i></div>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                
                // Add bus marker with high accuracy position in Nairobi
                const busMarker = L.marker([-1.2864, 36.8172], {
                    icon: busIcon,
                    // Add accuracy circle
                    accuracy: 10 // 10 meters accuracy radius
                }).addTo(window.busMap);
                
                // Add accuracy circle around bus
                const accuracyCircle = L.circle([-1.2864, 36.8172], {
                    radius: 10, // Initial 10m accuracy
                    color: '#34a853',
                    fillColor: '#34a853',
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(window.busMap);
                
                // Store accuracy circle in global scope
                window.busAccuracyCircle = accuracyCircle;
                
                busMarker.bindPopup("<strong>Smart Ride Bus #KDQ 144F</strong><br>High accuracy tracking").openPopup();
                
                // Simulate bus movement with enhanced animation
                simulateBusMovement(busMarker, accuracyCircle);
                
                // Update current location text with animation - use Nairobi location names
                document.getElementById('current-location').innerHTML = 'Nairobi CBD <span class="accuracy-badge high">High Accuracy</span>';
                document.getElementById('eta').innerHTML = '15 minutes';
                
                showToast('High Accuracy Map', 'Bus tracking map has been initialized with high accuracy in Nairobi.', 'success');
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
    
    // Add map satellite view toggle
    function addMapSatelliteToggle() {
        const mapContainer = document.getElementById('map');
        
        // Create satellite toggle button
        const satelliteToggle = document.createElement('div');
        satelliteToggle.className = 'map-satellite-toggle';
        satelliteToggle.innerHTML = '<i class="fas fa-satellite"></i> Satellite View';
        mapContainer.appendChild(satelliteToggle);
        
        // Initialize state
        let satelliteMode = false;
        let regularTileLayer = null;
        let satelliteTileLayer = null;
        
        // Store the regular tile layer
        regularTileLayer = window.busMap.getLayers().find(layer => layer instanceof L.TileLayer);
        
        // Create but don't add the satellite tile layer yet
        satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Imagery &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });
        
        // Handle toggle click
        satelliteToggle.addEventListener('click', function() {
            if (satelliteMode) {
                // Switch to regular view
                window.busMap.removeLayer(satelliteTileLayer);
                regularTileLayer.addTo(window.busMap);
                satelliteToggle.innerHTML = '<i class="fas fa-satellite"></i> Satellite View';
                showToast('Map Updated', 'Switched to standard map view', 'info');
            } else {
                // Switch to satellite view
                window.busMap.removeLayer(regularTileLayer);
                satelliteTileLayer.addTo(window.busMap);
                satelliteToggle.innerHTML = '<i class="fas fa-map"></i> Standard View';
                showToast('Map Updated', 'Switched to satellite map view', 'info');
            }
            
            // Toggle state
            satelliteMode = !satelliteMode;
        });
    }
    
    // Add map accuracy indicator
    function addMapAccuracyIndicator(level = "high") {
        const mapContainer = document.getElementById('map');
        
        // Remove existing indicator if any
        const existingIndicator = document.querySelector('.map-accuracy-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create accuracy indicator
        const accuracyIndicator = document.createElement('div');
        accuracyIndicator.className = `map-accuracy-indicator ${level}`;
        
        let text = "";
        let icon = "";
        
        switch(level) {
            case "high":
                text = "High Accuracy";
                icon = "signal";
                mapContainer.classList.add('map-accuracy-high');
                mapContainer.classList.remove('map-accuracy-medium', 'map-accuracy-low');
                break;
            case "medium":
                text = "Medium Accuracy";
                icon = "signal-alt";
                mapContainer.classList.add('map-accuracy-medium');
                mapContainer.classList.remove('map-accuracy-high', 'map-accuracy-low');
                break;
            case "low":
                text = "Low Accuracy";
                icon = "signal-alt-slash";
                mapContainer.classList.add('map-accuracy-low');
                mapContainer.classList.remove('map-accuracy-high', 'map-accuracy-medium');
                break;
        }
        
        accuracyIndicator.innerHTML = `<i class="fas fa-${icon}"></i> ${text}`;
        mapContainer.appendChild(accuracyIndicator);
    }
    
    // Add map controls for enhancing accuracy
    function addMapControls() {
        const mapContainer = document.getElementById('map');
        
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'map-controls';
        
        // Add zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'map-control-btn';
        zoomInBtn.innerHTML = '<i class="fas fa-plus"></i>';
        zoomInBtn.title = "Zoom in for higher accuracy";
        zoomInBtn.addEventListener('click', function() {
            window.busMap.zoomIn(1);
            updateMapAccuracyWithZoom(window.busMap.getZoom());
        });
        
        // Add zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'map-control-btn';
        zoomOutBtn.innerHTML = '<i class="fas fa-minus"></i>';
        zoomOutBtn.title = "Zoom out";
        zoomOutBtn.addEventListener('click', function() {
            window.busMap.zoomOut(1);
            updateMapAccuracyWithZoom(window.busMap.getZoom());
        });
        
        // Add high accuracy button
        const highAccuracyBtn = document.createElement('button');
        highAccuracyBtn.className = 'map-control-btn';
        highAccuracyBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        highAccuracyBtn.title = "Enable high accuracy mode";
        highAccuracyBtn.addEventListener('click', function() {
            enableHighAccuracyMode();
        });
        
        // Add refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'map-control-btn';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.title = "Refresh map data";
        refreshBtn.addEventListener('click', function() {
            refreshMapData();
        });
        
        // Add buttons to container
        controlsContainer.appendChild(zoomInBtn);
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(highAccuracyBtn);
        controlsContainer.appendChild(refreshBtn);
        
        // Add container to map
        mapContainer.appendChild(controlsContainer);
        
        // Listen for zoom changes
        window.busMap.on('zoomend', function() {
            updateMapAccuracyWithZoom(window.busMap.getZoom());
        });
    }
    
    // Update map accuracy indicator based on zoom level
    function updateMapAccuracyWithZoom(zoomLevel) {
        // Determine accuracy level based on zoom
        let accuracyLevel;
        
        if (zoomLevel >= 17) {
            accuracyLevel = "high";
            // Update accuracy circle if it exists
            if (window.busAccuracyCircle) {
                window.busAccuracyCircle.setRadius(10); // 10m radius
                window.busAccuracyCircle.setStyle({
                    color: '#34a853',
                    fillColor: '#34a853'
                });
            }
            showToast('High Accuracy', 'Map is now in high accuracy mode', 'success');
        } else if (zoomLevel >= 14) {
            accuracyLevel = "medium";
            // Update accuracy circle if it exists
            if (window.busAccuracyCircle) {
                window.busAccuracyCircle.setRadius(30); // 30m radius
                window.busAccuracyCircle.setStyle({
                    color: '#f59e0b',
                    fillColor: '#f59e0b'
                });
            }
            showToast('Medium Accuracy', 'Zoom in for higher accuracy', 'info');
        } else {
            accuracyLevel = "low";
            // Update accuracy circle if it exists
            if (window.busAccuracyCircle) {
                window.busAccuracyCircle.setRadius(100); // 100m radius
                window.busAccuracyCircle.setStyle({
                    color: '#dc2626',
                    fillColor: '#dc2626'
                });
            }
            showToast('Low Accuracy', 'Zoom in for better accuracy', 'warning');
        }
        
        // Update the indicator
        addMapAccuracyIndicator(accuracyLevel);
        
        // Update location text with accuracy badge
        const locationElement = document.getElementById('current-location');
        if (locationElement) {
            // Extract the location text without the badge
            const locationText = locationElement.innerHTML.split('<span')[0];
            locationElement.innerHTML = `${locationText}<span class="accuracy-badge ${accuracyLevel}">${accuracyLevel.charAt(0).toUpperCase() + accuracyLevel.slice(1)} Accuracy</span>`;
        }
    }
    
    // Enable high accuracy mode
    function enableHighAccuracyMode() {
        // If we're already at high zoom, try to refine position
        if (window.busMap.getZoom() >= 17) {
            // Simulate refining position
            showToast('Enhancing Accuracy', 'Refining position data...', 'info');
            
            // Show loading animation on accuracy indicator
            const indicator = document.querySelector('.map-accuracy-indicator');
            if (indicator) {
                const originalText = indicator.innerHTML;
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enhancing...';
                
                // After a delay, update with enhanced accuracy
                setTimeout(() => {
                    indicator.innerHTML = originalText;
                    
                    // Reduce accuracy circle size to indicate higher precision
                    if (window.busAccuracyCircle) {
                        window.busAccuracyCircle.setRadius(5); // 5m radius - super accurate
                    }
                    
                    showToast('Enhanced Accuracy', 'Position refined to 5m accuracy', 'success');
                }, 2000);
            }
        } else {
            // If not at high zoom, zoom in to the maximum level
            window.busMap.setZoom(19);
            showToast('Maximum Accuracy', 'Zoomed to highest precision level', 'success');
        }
    }
    
    // Refresh map data
    function refreshMapData() {
        // Visual feedback
        showToast('Refreshing Map', 'Updating map data...', 'info');
        
        // Add loading class to map
        const mapContainer = document.getElementById('map');
        mapContainer.classList.add('map-refreshing');
        
        // Show spinner on refresh button
        const refreshBtn = document.querySelector('.map-control-btn:nth-child(4)');
        if (refreshBtn) {
            const originalHTML = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
            
            // After a delay, update the map
            setTimeout(() => {
                mapContainer.classList.remove('map-refreshing');
                refreshBtn.innerHTML = originalHTML;
                refreshBtn.disabled = false;
                
                // If we have a bus marker, update its accuracy
                if (window.busAccuracyCircle) {
                    // Simulate improved accuracy
                    const currentRadius = window.busAccuracyCircle.getRadius();
                    window.busAccuracyCircle.setRadius(Math.max(5, currentRadius * 0.7)); // Improve by 30%
                }
                
                showToast('Map Updated', 'Map data refreshed successfully', 'success');
            }, 2000);
        }
    }
    
    // Simulate bus movement on the map with enhanced animation and accuracy
    function simulateBusMovement(marker, accuracyCircle) {
        // Example route points with high accuracy coordinates in Nairobi
        const routePoints = [
            [-1.2864, 36.8172], // Starting point - Nairobi CBD
            [-1.2853, 36.8201], // Kenyatta Avenue
            [-1.2838, 36.8232], // Moi Avenue
            [-1.2810, 36.8243], // Tom Mboya Street
            [-1.2789, 36.8264], // River Road
            [-1.2766, 36.8290]  // Ending point - Gikomba area
        ];
        
        let pointIndex = 0;
        
        // Create initial route path with enhanced styling
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
            
            // Also animate the accuracy circle
            animateAccuracyCircle(accuracyCircle, nextPoint, 2000);
            
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
            
            // Update current location with animated transition and accuracy badge
            const locations = [
                "Nairobi CBD",
                "Kenyatta Avenue",
                "Moi Avenue",
                "Tom Mboya Street",
                "River Road",
                "Gikomba Area"
            ];
            
            // Changes in accuracy to simulate real-world conditions
            const accuracyLevels = ["high", "high", "medium", "high", "high", "medium"];
            
            if (pointIndex < locations.length) {
                const locationElement = document.getElementById('current-location');
                locationElement.classList.add('fade-out');
                setTimeout(() => {
                    const accuracy = accuracyLevels[pointIndex];
                    locationElement.innerHTML = `${locations[pointIndex]} <span class="accuracy-badge ${accuracy}">${accuracy.charAt(0).toUpperCase() + accuracy.slice(1)} Accuracy</span>`;
                    locationElement.classList.remove('fade-out');
                    locationElement.classList.add('fade-in');
                    
                    // Also update map accuracy indicator
                    addMapAccuracyIndicator(accuracy);
                    
                    // Update accuracy circle radius based on accuracy level
                    if (accuracy === "high") {
                        accuracyCircle.setRadius(10);
                        accuracyCircle.setStyle({
                            color: '#34a853',
                            fillColor: '#34a853'
                        });
                    } else if (accuracy === "medium") {
                        accuracyCircle.setRadius(30);
                        accuracyCircle.setStyle({
                            color: '#f59e0b',
                            fillColor: '#f59e0b'
                        });
                    } else {
                        accuracyCircle.setRadius(100);
                        accuracyCircle.setStyle({
                            color: '#dc2626',
                            fillColor: '#dc2626'
                        });
                    }
                    
                    // Show toast for location change
                    showToast('Bus Moving', `Now at ${locations[pointIndex]}`, 'info');
                }, 300);
            }
        }, 3000);
    }
    
    // Get accuracy color based on accuracy in meters
    function getAccuracyColor(accuracy) {
        if (accuracy <= 15) { // High accuracy
            return '#34a853'; // Green
        } else if (accuracy <= 50) { // Medium accuracy
            return '#f59e0b'; // Orange
        } else { // Low accuracy
            return '#dc2626'; // Red
        }
    }
    
    // Get accuracy level string based on accuracy in meters
    function getAccuracyLevel(accuracy) {
        if (accuracy <= 15) {
            return "high";
        } else if (accuracy <= 50) {
            return "medium";
        } else {
            return "low";
        }
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
    
    // Setup route planner location detection with improved permission handling
    function setupRoutePlannerLocation() {
        const detectStartLocationBtn = document.getElementById('detect-start-location');
        const routeFromInput = document.getElementById('route-from');
        
        detectStartLocationBtn.addEventListener('click', function() {
            // Show loading state
            detectStartLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            routeFromInput.value = 'Requesting location access...';
            
            // Use our improved location permission system
            requestLocationPermission(
                // Success callback
                (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    
                    // Simulate getting address from coordinates
                    setTimeout(() => {
                        routeFromInput.value = `Current Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
                        detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                        showToast('Location Detected', 'Your current location has been set as the starting point', 'success');
                        
                        // Try to get a more human-readable address
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
                            .then(response => response.json())
                            .then(data => {
                                if (data && data.display_name) {
                                    routeFromInput.value = `${data.display_name} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
                                }
                            })
                            .catch(error => {
                                // Keep the coordinates if address lookup fails
                                console.error("Error getting address:", error);
                            });
                    }, 1000);
                },
                // Error callback
                (errorMsg) => {
                    routeFromInput.value = '';
                    detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                    showToast('Location Error', errorMsg, 'error');
                },
                // Purpose text
                "calculate the best route to your destination"
            );
        });
    }
    
    // Find route using real-time data from backend API
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
        
        // Parse starting and ending coordinates
        // For demo, extract coordinates from the input if available, or use default values
        let startCoords, endCoords;
        
        try {
            const startMatch = routeFrom.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
            if (startMatch) {
                startCoords = [parseFloat(startMatch[2]), parseFloat(startMatch[1])]; // [lng, lat] format for OSRM
            } else {
                // Default coordinates if not detected
                startCoords = [-74.0060, 40.7128]; // NYC default
            }
            
            if (routeTo.includes('Bus Stop') || routeTo.includes('Station') || routeTo.includes('Terminal')) {
                // If it's a bus stop, use the bus's current location as the destination
                fetch('/api/bus/location?bus_id=SR-1234')
                    .then(response => response.json())
                    .then(data => {
                        if (data.current_position) {
                            endCoords = [data.current_position[1], data.current_position[0]]; // Convert to [lng, lat]
                            getRouteFromBackend(startCoords, endCoords);
                        } else {
                            // Fallback coordinates
                            endCoords = [-73.9980, 40.7170]; // Columbus Circle area
                            getRouteFromBackend(startCoords, endCoords);
                        }
                    })
                    .catch(err => {
                        console.error("Error fetching bus location:", err);
                        // Fallback coordinates
                        endCoords = [-73.9980, 40.7170]; // Columbus Circle area
                        getRouteFromBackend(startCoords, endCoords);
                    });
            } else {
                // Try to extract coordinates from destination input
                const endMatch = routeTo.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
                if (endMatch) {
                    endCoords = [parseFloat(endMatch[2]), parseFloat(endMatch[1])]; // [lng, lat]
                } else {
                    // Default destination coordinates
                    endCoords = [-73.9980, 40.7170]; // Columbus Circle area
                }
                getRouteFromBackend(startCoords, endCoords);
            }
        } catch (error) {
            console.error("Error parsing coordinates:", error);
            // Use default coordinates
            startCoords = [-74.0060, 40.7128]; // NYC
            endCoords = [-73.9980, 40.7170]; // Columbus Circle area
            getRouteFromBackend(startCoords, endCoords);
        }
        
        // Set up automatic refresh for real-time updates
        if (window.routeRefreshInterval) {
            clearInterval(window.routeRefreshInterval);
        }
        window.routeRefreshInterval = setInterval(() => {
            // Only refresh if the modal is still open
            if (document.getElementById('route-planner-modal').style.display === 'block') {
                const selectedRoute = document.querySelector('.route-option.selected');
                if (selectedRoute) {
                    // Keep the same route selected after refresh
                    const selectedIndex = selectedRoute.dataset.routeIndex;
                    refreshRoute(startCoords, endCoords, selectedIndex);
                }
            } else {
                clearInterval(window.routeRefreshInterval);
            }
        }, 30000); // Refresh every 30 seconds
    }
    
    // Get route data from the backend
    function getRouteFromBackend(startCoords, endCoords) {
        // Use our backend API which connects to OSRM
        fetch(`/api/bus/route?from=${startCoords[1]},${startCoords[0]}&to=${endCoords[1]},${endCoords[0]}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Process the route data and display it
                displayRouteOptions(data, startCoords, endCoords);
            })
            .catch(error => {
                console.error("Error fetching route:", error);
                // Fallback to simulated routes in case of error
                displaySimulatedRoutes(startCoords, endCoords);
            });
    }
    
    // Refresh route data in real-time
    function refreshRoute(startCoords, endCoords, selectedRouteIndex) {
        // Only update the data without showing loading indicators
        fetch(`/api/bus/route?from=${startCoords[1]},${startCoords[0]}&to=${endCoords[1]},${endCoords[0]}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Quietly update the route information
                updateRouteOptions(data, selectedRouteIndex);
            })
            .catch(error => {
                console.error("Error refreshing route:", error);
                // Continue showing existing data, no need for fallback
            });
    }
    
    // Display route options from API data
    function displayRouteOptions(data, startCoords, endCoords) {
        const routeLoading = document.querySelector('.route-loading');
        const routeOptions = document.querySelector('.route-options');
        const openWazeBtn = document.getElementById('open-waze-btn');
        
        // Hide loading
        routeLoading.style.display = 'none';
        routeOptions.style.display = 'block';
        
        if (data && data.route) {
            // Real API data
            const mainRoute = {
                duration: Math.round(data.duration / 60) + ' min',
                distance: (data.distance / 1000).toFixed(1) + ' km',
                traffic: determineTrafficLevel(data.duration, data.distance),
                details: 'Via optimal route',
                geometry: data.route,
                eta: data.eta
            };
            
            // Generate slight variations for alternative routes
            const altRoute1 = {
                duration: Math.round(data.duration / 60 * 1.1) + ' min',
                distance: ((data.distance / 1000) * 0.95).toFixed(1) + ' km',
                traffic: determineTrafficLevel(data.duration * 1.1, data.distance * 0.95),
                details: 'Via alternative route',
                geometry: data.route, // In a real app, this would be a different geometry
                eta: Math.round(parseInt(data.eta) * 1.1) + ' minutes'
            };
            
            const altRoute2 = {
                duration: Math.round(data.duration / 60 * 1.2) + ' min',
                distance: ((data.distance / 1000) * 1.05).toFixed(1) + ' km',
                traffic: determineTrafficLevel(data.duration * 1.2, data.distance * 1.05),
                details: 'Via scenic route',
                geometry: data.route, // In a real app, this would be a different geometry
                eta: Math.round(parseInt(data.eta) * 1.2) + ' minutes'
            };
            
            const routes = [mainRoute, altRoute1, altRoute2];
            renderRouteOptions(routes);
            
            // Store the coordinates for refreshing
            window.lastRouteCoords = {
                start: startCoords,
                end: endCoords
            };
            
            // Enable Waze button
            openWazeBtn.disabled = false;
            
            // Show live data indicator
            showLiveDataIndicator();
            
            // Show success message
            showToast('Routes Found', 'Real-time routes to your destination have been found', 'success');
        } else {
            // Fallback to simulated routes
            displaySimulatedRoutes(startCoords, endCoords);
        }
    }
    
    // Update route options with fresh data without rebuilding the entire UI
    function updateRouteOptions(data, selectedRouteIndex) {
        if (!data || !data.route) return;
        
        const routeOptions = document.querySelectorAll('.route-option');
        if (routeOptions.length === 0) return;
        
        // Update the main route with real-time data
        if (routeOptions[0]) {
            const durationElement = routeOptions[0].querySelector('.route-time');
            const etaElement = routeOptions[0].querySelector('.route-eta');
            const trafficIndicator = routeOptions[0].querySelector('.route-traffic-indicator');
            
            if (durationElement) {
                const newDuration = Math.round(data.duration / 60) + ' min';
                if (durationElement.textContent !== newDuration) {
                    // Highlight changes with animation
                    durationElement.classList.add('updated-value');
                    setTimeout(() => durationElement.classList.remove('updated-value'), 2000);
                    durationElement.textContent = newDuration;
                }
            }
            
            if (etaElement) {
                etaElement.textContent = data.eta;
            }
            
            if (trafficIndicator) {
                const trafficLevel = determineTrafficLevel(data.duration, data.distance);
                trafficIndicator.className = `route-traffic-indicator ${trafficLevel === 'light' ? 'traffic-low' : 
                                                  trafficLevel === 'moderate' ? 'traffic-medium' : 'traffic-high'}`;
            }
        }
        
        // Also update alternative routes with appropriate scaling
        if (routeOptions[1]) {
            const durationElement = routeOptions[1].querySelector('.route-time');
            if (durationElement) {
                durationElement.textContent = Math.round(data.duration / 60 * 1.1) + ' min';
            }
        }
        
        if (routeOptions[2]) {
            const durationElement = routeOptions[2].querySelector('.route-time');
            if (durationElement) {
                durationElement.textContent = Math.round(data.duration / 60 * 1.2) + ' min';
            }
        }
        
        // Pulse the live indicator to show update
        pulseLiveIndicator();
        
        // Keep the previously selected route
        if (selectedRouteIndex && routeOptions[selectedRouteIndex]) {
            routeOptions.forEach(opt => opt.classList.remove('selected'));
            routeOptions[selectedRouteIndex].classList.add('selected');
        }
    }
    
    // Display simulated routes as a fallback
    function displaySimulatedRoutes(startCoords, endCoords) {
        const routeLoading = document.querySelector('.route-loading');
        const routeOptions = document.querySelector('.route-options');
        const openWazeBtn = document.getElementById('open-waze-btn');
        
        // Hide loading
        routeLoading.style.display = 'none';
        routeOptions.style.display = 'block';
        
        // Generate simulated routes
        const routes = [
            {
                duration: '25 min',
                distance: '8.5 km',
                traffic: 'light',
                details: 'Via Highway 101, Main St',
                eta: '25 minutes'
            },
            {
                duration: '32 min',
                distance: '7.2 km',
                traffic: 'moderate',
                details: 'Via Riverside Dr, Downtown',
                eta: '32 minutes'
            },
            {
                duration: '28 min',
                distance: '9.1 km',
                traffic: 'heavy',
                details: 'Via Parkway, Oak St',
                eta: '28 minutes'
            }
        ];
        
        renderRouteOptions(routes);
        
        // Enable Waze button
        openWazeBtn.disabled = false;
        
        // Show simulated data indicator
        showSimulatedDataIndicator();
        
        // Show fallback message
        showToast('Using Simulated Data', 'Real-time route data unavailable, showing estimates', 'warning');
    }
    
    // Render route options to the UI
    function renderRouteOptions(routes) {
        const routeOptions = document.querySelector('.route-options');
        let routeHTML = '';
        
        routes.forEach((route, index) => {
            const trafficClass = route.traffic === 'light' ? 'traffic-low' : 
                                route.traffic === 'moderate' ? 'traffic-medium' : 'traffic-high';
            
            const now = new Date();
            const arrivalTime = new Date(now.getTime() + (parseInt(route.duration) * 60 * 1000));
            const formattedArrivalTime = arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
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
                    <div class="route-arrival">
                        <span class="route-eta-label">ETA:</span>
                        <span class="route-eta">${route.eta}</span>
                        <span class="route-arrival-time">(Arrive at ${formattedArrivalTime})</span>
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
    }
    
    // Determine traffic level based on duration and distance
    function determineTrafficLevel(duration, distance) {
        // Calculate average speed in km/h
        const distanceKm = distance / 1000; // Convert meters to km
        const durationHours = duration / 3600; // Convert seconds to hours
        const avgSpeed = distanceKm / durationHours;
        
        // Determine traffic level based on average speed
        if (avgSpeed > 40) {
            return 'light';
        } else if (avgSpeed > 25) {
            return 'moderate';
        } else {
            return 'heavy';
        }
    }
    
    // Show real-time data indicator
    function showLiveDataIndicator() {
        const routeOptionsContainer = document.querySelector('.route-options');
        
        // Remove any existing indicator
        const existingIndicator = document.querySelector('.route-data-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create and add the live data indicator
        const liveIndicator = document.createElement('div');
        liveIndicator.className = 'route-data-indicator live';
        liveIndicator.innerHTML = `
            <span class="live-dot"></span>
            <span class="indicator-text">Live Traffic Data</span>
            <span class="update-time">Updated just now</span>
        `;
        
        routeOptionsContainer.parentNode.insertBefore(liveIndicator, routeOptionsContainer);
        
        // Start the update time counter
        updateLiveIndicatorTime();
    }
    
    // Show simulated data indicator
    function showSimulatedDataIndicator() {
        const routeOptionsContainer = document.querySelector('.route-options');
        
        // Remove any existing indicator
        const existingIndicator = document.querySelector('.route-data-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create and add the simulated data indicator
        const simulatedIndicator = document.createElement('div');
        simulatedIndicator.className = 'route-data-indicator simulated';
        simulatedIndicator.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span class="indicator-text">Simulated Data</span>
            <span class="update-time">Real-time data unavailable</span>
        `;
        
        routeOptionsContainer.parentNode.insertBefore(simulatedIndicator, routeOptionsContainer);
    }
    
    // Update the live indicator time text
    function updateLiveIndicatorTime() {
        const updateTimeElement = document.querySelector('.route-data-indicator .update-time');
        if (!updateTimeElement) return;
        
        let seconds = 0;
        
        if (window.updateTimeInterval) {
            clearInterval(window.updateTimeInterval);
        }
        
        updateTimeElement.textContent = 'Updated just now';
        
        window.updateTimeInterval = setInterval(() => {
            seconds += 5;
            if (seconds < 60) {
                updateTimeElement.textContent = `Updated ${seconds} seconds ago`;
            } else {
                const minutes = Math.floor(seconds / 60);
                updateTimeElement.textContent = `Updated ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            }
        }, 5000);
    }
    
    // Pulse the live indicator to show data refresh
    function pulseLiveIndicator() {
        const liveIndicator = document.querySelector('.route-data-indicator');
        if (!liveIndicator) return;
        
        // Reset update time
        const updateTimeElement = liveIndicator.querySelector('.update-time');
        if (updateTimeElement) {
            updateTimeElement.textContent = 'Updated just now';
        }
        
        // Add pulse animation
        liveIndicator.classList.add('pulse-update');
        setTimeout(() => {
            liveIndicator.classList.remove('pulse-update');
        }, 2000);
        
        // Reset seconds counter
        if (window.updateTimeInterval) {
            clearInterval(window.updateTimeInterval);
            updateLiveIndicatorTime();
        }
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
        
        // Try to extract coordinates
        let startLat, startLng, endLat, endLng;
        
        const startMatch = routeFrom.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
        if (startMatch) {
            startLat = startMatch[1];
            startLng = startMatch[2];
        }
        
        const endMatch = routeTo.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
        if (endMatch) {
            endLat = endMatch[1];
            endLng = endMatch[2];
        }
        
        // Build Waze URL with coordinates if available
        let wazeUrl;
        if (startLat && startLng && endLat && endLng) {
            wazeUrl = `https://waze.com/ul?ll=${endLat},${endLng}&navigate=yes&from=${startLat},${startLng}`;
        } else {
            wazeUrl = `https://waze.com/ul?q=${routeTo}&navigate=yes`;
        }
        
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

// Location Permission Handler System
function requestLocationPermission(successCallback, errorCallback, purposeText = "provide location services") {
    // Check if the browser supports geolocation
    if (!navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by this browser";
        if (errorCallback) errorCallback(errorMsg);
        showToast('Location Error', errorMsg, 'error');
        return false;
    }
    
    // Check if permission is already granted (can only be determined when we try to access)
    if (typeof navigator.permissions !== 'undefined' && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
            if (permissionStatus.state === 'granted') {
                // Permission already granted, proceed
                if (successCallback) successCallback();
            } else if (permissionStatus.state === 'prompt') {
                // Need to request permission - show purpose dialog first
                showLocationPurposeDialog(purposeText, () => {
                    startGeolocation(successCallback, errorCallback);
                });
            } else if (permissionStatus.state === 'denied') {
                // Permission was denied previously
                showLocationDeniedDialog(errorCallback);
            }
            
            // Add listener for future permission changes
            permissionStatus.onchange = function() {
                if (this.state === 'granted' && successCallback) {
                    showToast('Location Permission Granted', 'You can now use location features', 'success');
                    successCallback();
                }
            };
        });
    } else {
        // Browser doesn't support permission API, fallback to directly asking
        showLocationPurposeDialog(purposeText, () => {
            startGeolocation(successCallback, errorCallback);
        });
    }
}

function showLocationPurposeDialog(purposeText, confirmCallback) {
    // Create and show a purpose dialog explaining why we need location
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'permission-dialog-overlay';
    
    const dialogBox = document.createElement('div');
    dialogBox.className = 'permission-dialog';
    dialogBox.innerHTML = `
        <div class="permission-dialog-header">
            <i class="fas fa-map-marker-alt"></i>
            <h3>Location Permission</h3>
        </div>
        <div class="permission-dialog-body">
            <p>Smart Ride needs your location to ${purposeText}.</p>
            <p>This information helps us provide better service and will not be shared with third parties.</p>
            <div class="permission-dialog-icon">
                <i class="fas fa-location-arrow"></i>
            </div>
        </div>
        <div class="permission-dialog-footer">
            <button class="btn permission-cancel">Not Now</button>
            <button class="btn permission-allow">Allow Location Access</button>
        </div>
    `;
    
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);
    
    // Add event listeners to buttons
    const allowButton = dialogBox.querySelector('.permission-allow');
    const cancelButton = dialogBox.querySelector('.permission-cancel');
    
    allowButton.addEventListener('click', function() {
        document.body.removeChild(dialogOverlay);
        if (confirmCallback) confirmCallback();
    });
    
    cancelButton.addEventListener('click', function() {
        document.body.removeChild(dialogOverlay);
        showToast('Location Access Declined', 'Location features will not be available', 'warning');
    });
    
    // Animation
    setTimeout(() => {
        dialogBox.classList.add('show');
    }, 10);
}

function showLocationDeniedDialog(errorCallback) {
    // Create and show a dialog when permission is denied
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'permission-dialog-overlay';
    
    const dialogBox = document.createElement('div');
    dialogBox.className = 'permission-dialog';
    dialogBox.innerHTML = `
        <div class="permission-dialog-header warning">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Location Permission Denied</h3>
        </div>
        <div class="permission-dialog-body">
            <p>You've previously denied location access.</p>
            <p>To use this feature, please enable location permissions in your browser settings.</p>
            <div class="permission-help">
                <div class="browser-instructions">
                    <p><strong>How to enable location:</strong></p>
                    <ul>
                        <li>Click the lock/info icon in your address bar</li>
                        <li>Find "Location" or "Site settings"</li>
                        <li>Change the permission to "Allow"</li>
                        <li>Refresh this page</li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="permission-dialog-footer">
            <button class="btn permission-cancel">Cancel</button>
            <button class="btn permission-retry">Try Again</button>
        </div>
    `;
    
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);
    
    // Add event listeners to buttons
    const retryButton = dialogBox.querySelector('.permission-retry');
    const cancelButton = dialogBox.querySelector('.permission-cancel');
    
    retryButton.addEventListener('click', function() {
        document.body.removeChild(dialogOverlay);
        // Try to request permission again
        startGeolocation(() => {
            showToast('Location Access Granted', 'Thank you for enabling location services', 'success');
        }, errorCallback);
    });
    
    cancelButton.addEventListener('click', function() {
        document.body.removeChild(dialogOverlay);
        if (errorCallback) {
            errorCallback("Location permission denied by user");
        }
    });
    
    // Animation
    setTimeout(() => {
        dialogBox.classList.add('show');
    }, 10);
}

function startGeolocation(successCallback, errorCallback) {
    navigator.geolocation.getCurrentPosition(
        // Success
        (position) => {
            if (successCallback) successCallback(position);
        },
        // Error
        (error) => {
            console.error("Geolocation error:", error);
            if (error.code === error.PERMISSION_DENIED) {
                showLocationDeniedDialog(errorCallback);
            } else if (errorCallback) {
                errorCallback(getLocationErrorMessage(error));
            }
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Initialize passenger pickup management for drivers
function initPassengerPickupManagement() {
    const pickupManagement = document.getElementById('passenger-pickup-management');
    
    // Initially hide the pickup management section
    if (pickupManagement) {
        pickupManagement.style.display = 'none';
        
        // Initialize pickup time management when driver authenticates
        driverAuthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('driver-username').value;
            const password = document.getElementById('driver-password').value;
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            
            // Check credentials against stored values (simulated delay for realism)
            setTimeout(() => {
                if (username === driverCredentials.username && password === driverCredentials.password) {
                    // Authentication successful
                    isDriverAuthenticated = true;
                    
                    // Update UI for driver authentication
                    updateDriverAuthUI(username);
                    
                    // Show pickup management section
                    pickupManagement.style.display = 'block';
                    
                    // Fetch and display passenger pickup times
                    fetchPassengerPickupTimes();
                    
                    // Set up periodic refresh of passenger pickup times
                    if (window.pickupTimesInterval) {
                        clearInterval(window.pickupTimesInterval);
                    }
                    window.pickupTimesInterval = setInterval(fetchPassengerPickupTimes, 30000); // Refresh every 30 seconds
                    
                    // Restore button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                } else {
                    // Authentication failed
                    isDriverAuthenticated = false;
                    
                    // Show error with animation
                    const authError = document.getElementById('auth-error');
                    authError.textContent = 'Invalid username or password. Please try again.';
                    authError.classList.add('shake');
                    setTimeout(() => {
                        authError.classList.remove('shake');
                    }, 500);
                    
                    // Show error toast
                    showToast('Authentication Failed', 'Invalid username or password. Please try again.', 'error');
                    
                    // Restore button state
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }, 1500);
        });
    } else {
        console.error("Pickup management container not found in the DOM");
    }
}

// Helper function to update driver auth UI
function updateDriverAuthUI(username) {
    const driverStatus = document.getElementById('driver-status');
    const driverAuthBtn = document.getElementById('driver-auth-btn');
    const startTrackingBtn = document.getElementById('start-tracking-btn');
    const driverAuthModal = document.getElementById('driver-auth-modal');
    
    // Update UI with animation
    if (driverStatus) {
        driverStatus.textContent = `Authenticated as Driver ${username}`;
        driverStatus.classList.add('authenticated');
        
        // Add animation to the status
        driverStatus.classList.add('pulse-once');
        setTimeout(() => {
            driverStatus.classList.remove('pulse-once');
        }, 500);
    }
    
    // Enable tracking controls with animation
    if (startTrackingBtn) {
        startTrackingBtn.disabled = false;
        startTrackingBtn.classList.add('fade-in');
    }
    
    if (driverAuthBtn) {
        driverAuthBtn.disabled = true;
        driverAuthBtn.classList.add('fade-out');
    }
    
    // Hide authentication modal with animation
    if (driverAuthModal) {
        driverAuthModal.classList.remove('modal-active');
        setTimeout(() => {
            driverAuthModal.style.display = 'none';
        }, 300);
    }
    
    // Clear error if any
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.textContent = '';
    }
    
    // Show success toast
    showToast('Authentication Successful', `Logged in as Driver ${username}`, 'success');
}

// Initialize tracking features when tracking modal is opened
document.getElementById('track-btn').addEventListener('click', function() {
    // Open the tracking modal
    document.getElementById('tracking-modal').style.display = 'block';
    document.getElementById('tracking-modal').classList.add('modal-active');
    
    // Initialize map if not already done
    if (!map) {
        initializeMap();
    }
    
    // Start polling for location updates
    startBusLocationPolling();
    
    // Reset any previous UI states
    document.getElementById('bus-info-container').innerHTML = '';
    document.getElementById('passenger-count').textContent = '0';
    document.getElementById('current-location').textContent = 'Loading...';
    document.getElementById('eta').textContent = 'Calculating...';
});

// Close tracking modal and cleanup resources
document.querySelectorAll('#tracking-modal .close').forEach(function(closeBtn) {
    closeBtn.addEventListener('click', function() {
        document.getElementById('tracking-modal').style.display = 'none';
        document.getElementById('tracking-modal').classList.remove('modal-active');
        
        // Stop polling when modal is closed
        if (window.busLocationInterval) {
            clearInterval(window.busLocationInterval);
            window.busLocationInterval = null;
        }
    });
});

// Fetch route information from server
function fetchRouteFromServer() {
    fetch('/api/bus/route?bus_id=KDQ 144F')
        .then(response => response.json())
        .then(data => {
            if (data.route && map) {
                // Draw route on map
                const coordinates = data.route.coordinates.map(coord => [coord[1], coord[0]]);
                
                // Remove any existing route
                if (window.routeLine) {
                    window.routeLine.remove();
                }
                
                // Add the new route
                window.routeLine = L.polyline(coordinates, {
                    color: '#1a73e8',
                    weight: 5,
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(map);
                
                // Fit map bounds to the route
                map.fitBounds(window.routeLine.getBounds(), {
                    padding: [50, 50]
                });
            }
        })
        .catch(error => {
            console.error('Error fetching bus route:', error);
        });
}

// Update passenger markers on the map
function updatePassengerMarkers(passengers) {
    // Clear existing passenger markers
    if (window.passengerMarkers && window.passengerMarkers.length > 0) {
        window.passengerMarkers.forEach(marker => {
            marker.remove();
        });
        window.passengerMarkers = [];
    } else {
        window.passengerMarkers = [];
    }
    
    // Update passenger count
    document.getElementById('passenger-count').textContent = passengers.length;
    
    // Add new passenger markers
    passengers.forEach(passenger => {
        // Create a custom passenger icon
        const passengerIcon = L.divIcon({
            className: 'passenger-marker',
            html: '<i class="fas fa-user"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([passenger.position[0], passenger.position[1]], {
            icon: passengerIcon
        }).addTo(map);
        
        marker.bindPopup(`<b>${passenger.name || 'Passenger'}</b><br>Distance: ${passenger.distance}km`);
        
        window.passengerMarkers.push(marker);
    });
}

// "Start Live Tracking" button event 
document.getElementById('start-tracking-btn').addEventListener('click', function() {
    // Request the server to start the bus movement simulation
    fetch('/api/bus/start-tracking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bus_id: 'KDQ 144F'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'started' || data.status === 'already_active') {
            // Update UI to reflect tracking is active
            document.getElementById('tracking-status').textContent = 'Live tracking active';
            document.getElementById('tracking-status').classList.add('active');
            document.getElementById('tracking-status').classList.remove('inactive');
            
            // Disable start button and enable stop button
            document.getElementById('start-tracking-btn').disabled = true;
            document.getElementById('stop-tracking-btn').disabled = false;
            
            // Make sure we're polling for location updates
            startBusLocationPolling();
            
            // Show success toast
            showToast('Tracking Active', 'Live bus tracking is now active', 'success');
            
            // Add a live indicator to the bus heading
            const busInfoHeader = document.querySelector('.bus-info-header h3');
            if (busInfoHeader && !busInfoHeader.querySelector('.live-tracking-indicator')) {
                const liveIndicator = document.createElement('span');
                liveIndicator.className = 'live-tracking-indicator';
                busInfoHeader.appendChild(liveIndicator);
            }
        } else {
            showToast('Error', 'Failed to start tracking', 'error');
        }
    })
    .catch(error => {
        console.error('Error starting tracking:', error);
        showToast('Connection Error', 'Failed to connect to server', 'error');
    });
});

// "Stop Tracking" button event
document.getElementById('stop-tracking-btn').addEventListener('click', function() {
    // Request the server to stop the bus movement simulation
    fetch('/api/bus/stop-tracking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bus_id: 'KDQ 144F'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'stopped') {
            // Update UI to reflect tracking is inactive
            document.getElementById('tracking-status').textContent = 'Tracking inactive';
            document.getElementById('tracking-status').classList.remove('active');
            document.getElementById('tracking-status').classList.add('inactive');
            
            // Enable start button and disable stop button
            document.getElementById('start-tracking-btn').disabled = false;
            document.getElementById('stop-tracking-btn').disabled = true;
            
            // Show success toast
            showToast('Tracking Stopped', 'Live bus tracking has been stopped', 'info');
            
            // Remove live indicator
            const liveIndicator = document.querySelector('.live-tracking-indicator');
            if (liveIndicator) {
                liveIndicator.remove();
            }
        } else {
            showToast('Error', 'Failed to stop tracking', 'error');
        }
    })
    .catch(error => {
        console.error('Error stopping tracking:', error);
        showToast('Connection Error', 'Failed to connect to server', 'error');
    });
});

// Handle driver authentication
document.getElementById('driver-auth-btn').addEventListener('click', function() {
    // Show the driver authentication modal
    document.getElementById('driver-auth-modal').style.display = 'block';
    document.getElementById('driver-auth-modal').classList.add('modal-active');
    
    // Focus on the username input
    setTimeout(() => {
        document.getElementById('driver-username').focus();
    }, 300);
});

// Handle driver login form submission
document.getElementById('driver-auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('driver-username').value;
    const password = document.getElementById('driver-password').value;
    
    // For demo purposes, accept any username/password combination
    // In a real app, this would verify credentials with the server
    
    // Close the auth modal
    document.getElementById('driver-auth-modal').style.display = 'none';
    document.getElementById('driver-auth-modal').classList.remove('modal-active');
    
    // Update the driver status
    document.getElementById('driver-status').textContent = 'Driver authenticated: ' + username;
    document.getElementById('driver-status').classList.add('authenticated');
    
    // Enable the tracking controls
    document.getElementById('start-tracking-btn').disabled = false;
    
    // Show success toast
    showToast('Authentication Success', 'Driver controls are now enabled', 'success');
});

// Create a toast notification helper function
function showToast(title, message, type) {
    // Check if toast container exists, if not create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    // Set content
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <span class="toast-close">&times;</span>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Handle close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    // Auto close after 5 seconds for non-error toasts
    if (type !== 'error') {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Close driver auth modal when close button is clicked
document.querySelector('#driver-auth-modal .close').addEventListener('click', function() {
    document.getElementById('driver-auth-modal').style.display = 'none';
    document.getElementById('driver-auth-modal').classList.remove('modal-active');
});

// Detect keyboard events to close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('modal-active');
        });
        
        // Stop polling when modals are closed
        if (window.busLocationInterval) {
            clearInterval(window.busLocationInterval);
            window.busLocationInterval = null;
        }
    }
});

// Create a global variable to hold the bus marker
let busMarker = null;

// Update bus position on the map
function updateBusPosition(position) {
    // Update current location text
    const geocoder = L.Control.Geocoder.nominatim();
    geocoder.reverse(
        { lat: position.coords.latitude, lng: position.coords.longitude },
        map.getZoom(),
        results => {
            if (results && results.length > 0) {
                const currentLocation = document.getElementById('current-location');
                currentLocation.textContent = results[0].name;
                currentLocation.className = 'updated-value';
                setTimeout(() => {
                    currentLocation.className = '';
                }, 2000);
            }
        }
    );

    // Update the map marker if it exists, otherwise create it
    if (busMarker) {
        busMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
    } else if (map) {
        // Create a custom bus icon
        const busIcon = L.divIcon({
            className: 'bus-marker',
            html: '<i class="fas fa-bus"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        busMarker = L.marker([position.coords.latitude, position.coords.longitude], {
            icon: busIcon
        }).addTo(map);
        
        busMarker.bindPopup('<b>Bus KDQ 144F</b><br>Click for more info');
    }
    
    // Rotate the bus icon based on heading
    if (busMarker && position.coords.heading !== null && position.coords.heading !== undefined) {
        const busIconElement = busMarker.getElement().querySelector('i');
        if (busIconElement) {
            busIconElement.style.transform = `rotate(${position.coords.heading}deg)`;
        }
    }
    
    // Ensure map is centered on bus with smooth animation
    if (map && busMarker) {
        map.panTo(busMarker.getLatLng(), {
            animate: true,
            duration: 0.5
        });
    }
}

// Route Planner Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get route planner elements
    const routePlannerBtn = document.getElementById('route-planner-btn');
    const routePlannerModal = document.getElementById('route-planner-modal');
    const detectStartLocationBtn = document.getElementById('detect-start-location');
    const routeFromInput = document.getElementById('route-from');
    const routeToInput = document.getElementById('route-to');
    const departureTimeSelect = document.getElementById('departure-time');
    const customTimeContainer = document.getElementById('custom-time-container');
    const customTimeInput = document.getElementById('custom-time');
    const customDateInput = document.getElementById('custom-date');
    const findRouteBtn = document.getElementById('find-route-btn');
    const routeResults = document.getElementById('route-results');
    const routeLoading = document.querySelector('.route-loading');
    const routeOptions = document.querySelector('.route-options');
    const openWazeBtn = document.getElementById('open-waze-btn');
    const closeBtns = document.querySelectorAll('.close');
    
    // Initialize with current date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    if (customDateInput) {
        customDateInput.value = formattedDate;
    }
    
    // Add event listener to open route planner modal
    if (routePlannerBtn) {
        routePlannerBtn.addEventListener('click', function() {
            routePlannerModal.style.display = 'block';
            setTimeout(() => {
                routePlannerModal.classList.add('modal-active');
            }, 10);
            
            // Setup current location detection
            setupRoutePlannerLocation();
        });
    }
    
    // Setup departure time selector
    if (departureTimeSelect) {
        departureTimeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customTimeContainer.style.display = 'flex';
                // Set default time to current time + 15 min
                const now = new Date();
                now.setMinutes(now.getMinutes() + 15);
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                customTimeInput.value = `${hours}:${minutes}`;
            } else {
                customTimeContainer.style.display = 'none';
            }
        });
    }
    
    // Setup detect location button
    if (detectStartLocationBtn) {
        detectStartLocationBtn.addEventListener('click', function() {
            // Show loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            routeFromInput.value = 'Detecting location...';
            
            // Use location permission system
            requestLocationPermission(
                (position) => {
                    // Success
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Reverse geocode to get address
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
                        .then(response => response.json())
                        .then(data => {
                            // Format location string with coordinates
                            let address = data.display_name || 'Current Location';
                            routeFromInput.value = `${address} (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                            
                            // Update button
                            detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                            showToast('Location Detected', 'Your current location has been detected successfully', 'success');
                            
                            // Auto-search for nearby bus stops
                            findNearbyBusStops(lat, lng);
                        })
                        .catch(error => {
                            console.error("Error in reverse geocoding:", error);
                            routeFromInput.value = `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                            detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                        });
                },
                (errorMsg) => {
                    // Error
                    routeFromInput.value = '';
                    detectStartLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
                    showToast('Location Error', errorMsg, 'error');
                },
                "plan your bus route accurately"
            );
        });
    }
    
    // Setup find route button
    if (findRouteBtn) {
        findRouteBtn.addEventListener('click', function() {
            findRoute();
        });
    }
    
    // Setup Waze button
    if (openWazeBtn) {
        openWazeBtn.addEventListener('click', function() {
            openInWaze();
        });
    }
    
    // Close modal when clicking close button
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('modal-active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
                
                // Clear any route refresh intervals
                if (window.routeRefreshInterval) {
                    clearInterval(window.routeRefreshInterval);
                    window.routeRefreshInterval = null;
                }
            }
        });
    });
    
    // Find nearby bus stops based on current location
    function findNearbyBusStops(latitude, longitude) {
        // Show searching notification
        showToast('Searching Bus Stops', 'Looking for nearby bus stops...', 'info');
        
        // In a real app, this would use an API call to a bus stop database
        // For this demo, we'll simulate with some fake data
        setTimeout(() => {
            // Simulate bus stops with slight coordinate variations from the user's position
            nearbyBusStops = [
                {
                    name: "Main Street Station",
                    distance: "0.3 km",
                    position: [latitude + 0.002, longitude + 0.001]
                },
                {
                    name: "Central Park Stop",
                    distance: "0.5 km",
                    position: [latitude - 0.001, longitude + 0.002]
                },
                {
                    name: "Downtown Terminal",
                    distance: "0.8 km",
                    position: [latitude + 0.003, longitude - 0.002]
                }
            ];
            
            // Create dropdown for bus stops
            let busStopOptions = '<div class="bus-stops-dropdown">';
            busStopOptions += '<p>Nearby Bus Stops:</p>';
            busStopOptions += '<ul>';
            
            nearbyBusStops.forEach((stop, index) => {
                busStopOptions += `
                    <li data-index="${index}">
                        <strong>${stop.name}</strong> (${stop.distance})
                    </li>
                `;
            });
            
            busStopOptions += '</ul></div>';
            
            // Show options
            const locationContainer = routeFromInput.parentNode;
            
            // Remove existing dropdown if any
            const existingDropdown = locationContainer.querySelector('.bus-stops-dropdown');
            if (existingDropdown) {
                existingDropdown.remove();
            }
            
            // Add new dropdown
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'dropdown-container';
            dropdownContainer.innerHTML = busStopOptions;
            locationContainer.appendChild(dropdownContainer);
            
            // Add click events to list items
            const listItems = dropdownContainer.querySelectorAll('li');
            listItems.forEach(item => {
                item.addEventListener('click', function() {
                    const index = parseInt(this.dataset.index);
                    const stop = nearbyBusStops[index];
                    routeFromInput.value = `${stop.name} (${stop.position[0].toFixed(6)}, ${stop.position[1].toFixed(6)})`;
                    
                    // Remove dropdown after selection
                    dropdownContainer.remove();
                    
                    // Show selection toast
                    showToast('Bus Stop Selected', `Selected starting point: ${stop.name}`, 'success');
                });
            });
            
            // Show success notification
            showToast('Bus Stops Found', `Found ${nearbyBusStops.length} bus stops near you`, 'success');
        }, 1500);
    }
    
    // Find route with real-time data
    function findRoute() {
        const routeFrom = routeFromInput.value;
        const routeTo = routeToInput.value;
        const departureTime = departureTimeSelect.value;
        
        // Validate inputs
        if (!routeFrom || !routeTo) {
            showToast('Input Required', 'Please enter both starting point and destination', 'warning');
            return;
        }
        
        // Show loading state
        routeLoading.style.display = 'block';
        routeOptions.style.display = 'none';
        openWazeBtn.disabled = true;
        
        // Extract coordinates from input if available
        let startCoords, endCoords;
        
        try {
            // Try to extract coordinates from the format "Location Name (lat, lng)"
            const startMatch = routeFrom.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
            if (startMatch) {
                startCoords = [parseFloat(startMatch[1]), parseFloat(startMatch[2])];
            } else {
                // Fallback to geocoding the address
                startCoords = [0, 0]; // This would be replaced with geocoding in a real app
            }
            
            const endMatch = routeTo.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
            if (endMatch) {
                endCoords = [parseFloat(endMatch[1]), parseFloat(endMatch[2])];
            } else {
                // Fallback coordinates for simulation
                endCoords = [startCoords[0] + 0.05, startCoords[1] + 0.03];
            }
            
            // Simulate getting routes
            simulateRouteCalculation(startCoords, endCoords, departureTime);
            
        } catch (error) {
            console.error("Error parsing coordinates:", error);
            // Fallback to simulated route
            simulateRouteCalculation([0, 0], [0.05, 0.03], departureTime);
        }
    }
    
    // Simulate route calculation with real-time data
    function simulateRouteCalculation(startCoords, endCoords, departureTime) {
        // In a real app, this would call a routing API with real-time traffic data
        
        // Simulate API call delay
        setTimeout(() => {
            // Calculate base distance in kilometers (very simplified)
            const distance = Math.sqrt(
                Math.pow(endCoords[0] - startCoords[0], 2) + 
                Math.pow(endCoords[1] - startCoords[1], 2)
            ) * 111; // Rough conversion from degrees to km
            
            // Simulate real-time traffic based on time of day
            let trafficFactor = 1.0;
            const now = new Date();
            const hour = now.getHours();
            
            // Simulate peak hours traffic
            if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
                trafficFactor = 1.5 + (Math.random() * 0.5); // 1.5-2.0x slowdown during peak
            } else if ((hour >= 10 && hour <= 15) || (hour >= 19 && hour <= 20)) {
                trafficFactor = 1.1 + (Math.random() * 0.3); // 1.1-1.4x slowdown during regular hours
            } else {
                trafficFactor = 1.0 + (Math.random() * 0.1); // 1.0-1.1x during off-peak
            }
            
            // Base duration in minutes (assume average speed of 30 km/h)
            const baseDuration = (distance / 30) * 60;
            
            // Apply traffic factor
            const realTimeDuration = Math.round(baseDuration * trafficFactor);
            
            // Generate routes with variations
            const mainRoute = {
                duration: realTimeDuration,
                distance: distance.toFixed(1),
                traffic: determineTrafficLevel(trafficFactor),
                details: 'Via main roads',
                eta: calculateETA(realTimeDuration, departureTime)
            };
            
            // Alternative routes with slight variations
            const altRoute1 = {
                duration: Math.round(realTimeDuration * 0.9),
                distance: (distance * 1.1).toFixed(1),
                traffic: determineTrafficLevel(trafficFactor * 0.9),
                details: 'Via highways',
                eta: calculateETA(Math.round(realTimeDuration * 0.9), departureTime)
            };
            
            const altRoute2 = {
                duration: Math.round(realTimeDuration * 1.2),
                distance: (distance * 0.8).toFixed(1),
                traffic: determineTrafficLevel(trafficFactor * 1.2),
                details: 'Via scenic route',
                eta: calculateETA(Math.round(realTimeDuration * 1.2), departureTime)
            };
            
            // Display the routes
            displayRoutes([mainRoute, altRoute1, altRoute2], startCoords, endCoords);
            
            // Set up real-time updates
            setupRealTimeUpdates(startCoords, endCoords, departureTime);
        }, 2000);
    }
    
    // Determine traffic level based on traffic factor
    function determineTrafficLevel(trafficFactor) {
        if (trafficFactor < 1.2) {
            return 'light';
        } else if (trafficFactor < 1.6) {
            return 'moderate';
        } else {
            return 'heavy';
        }
    }
    
    // Calculate ETA based on duration and departure time
    function calculateETA(durationMinutes, departureTime) {
        const now = new Date();
        let departureDate = new Date();
        
        // Handle different departure time options
        if (departureTime === 'now') {
            // Use current time
        } else if (departureTime === 'custom') {
            // Use custom time input
            const customTime = customTimeInput.value;
            const customDate = customDateInput.value;
            
            if (customTime && customDate) {
                const [hours, minutes] = customTime.split(':');
                departureDate = new Date(customDate);
                departureDate.setHours(parseInt(hours), parseInt(minutes), 0);
            }
        } else {
            // Handle preset times (e.g., "in_15_min", "in_30_min")
            const minutesToAdd = parseInt(departureTime.replace('in_', '').replace('_min', ''));
            departureDate.setMinutes(departureDate.getMinutes() + minutesToAdd);
        }
        
        // Calculate arrival time
        const arrivalDate = new Date(departureDate.getTime() + (durationMinutes * 60 * 1000));
        
        // Format ETA string
        if (departureTime === 'now') {
            return `${durationMinutes} minutes`;
        } else {
            const timeString = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `Arrive at ${timeString}`;
        }
    }
    
    // Display routes on the UI
    function displayRoutes(routes, startCoords, endCoords) {
        const routeLoading = document.querySelector('.route-loading');
        const routeOptions = document.querySelector('.route-options');
        const openWazeBtn = document.getElementById('open-waze-btn');
        
        // Hide loading, show options
        routeLoading.style.display = 'none';
        routeOptions.style.display = 'block';
        
        // Build HTML for routes
        let routesHTML = '';
        routes.forEach((route, index) => {
            const trafficClass = route.traffic === 'light' ? 'traffic-low' : 
                                 route.traffic === 'moderate' ? 'traffic-medium' : 'traffic-high';
            
            routesHTML += `
                <div class="route-option ${index === 0 ? 'selected' : ''}" data-route-index="${index}">
                    <div class="route-option-header">
                        <span class="route-time">${route.duration} min</span>
                        <span class="route-distance">${route.distance} km</span>
                    </div>
                    <div class="route-details">
                        <span class="route-traffic-indicator ${trafficClass}"></span>
                        ${route.traffic.charAt(0).toUpperCase() + route.traffic.slice(1)} traffic · ${route.details}
                    </div>
                    <div class="route-arrival">
                        <span class="route-eta-label">ETA:</span>
                        <span class="route-eta">${route.eta}</span>
                    </div>
                </div>
            `;
        });
        
        // Update UI
        routeOptions.innerHTML = routesHTML;
        
        // Show live data indicator
        addLiveDataIndicator();
        
        // Enable Waze button
        openWazeBtn.disabled = false;
        
        // Store coordinates for refreshing
        window.lastRouteCoords = {
            start: startCoords,
            end: endCoords
        };
        
        // Add click handlers to route options
        document.querySelectorAll('.route-option').forEach(option => {
            option.addEventListener('click', function() {
                // Deselect all routes
                document.querySelectorAll('.route-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Select this route
                this.classList.add('selected');
                
                // Store selected route index for refreshing
                window.selectedRouteIndex = parseInt(this.dataset.routeIndex);
                
                // Show selection toast
                const routeTime = this.querySelector('.route-time').textContent;
                const routeDetails = this.querySelector('.route-details').textContent;
                showToast('Route Selected', `Selected route: ${routeTime} - ${routeDetails}`, 'success');
            });
        });
        
        // Show success toast
        showToast('Routes Found', 'Real-time routes calculated successfully', 'success');
    }
    
    // Add live data indicator
    function addLiveDataIndicator() {
        const routeOptions = document.querySelector('.route-options');
        
        // Remove existing indicator if any
        const existingIndicator = document.querySelector('.live-data-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = 'live-data-indicator';
        indicator.innerHTML = `
            <span class="live-dot"></span>
            <span class="indicator-text">Live Traffic Data</span>
            <span class="update-time">Updated just now</span>
        `;
        
        // Insert before route options
        routeOptions.parentNode.insertBefore(indicator, routeOptions);
        
        // Start update timer
        startUpdateTimer();
    }
    
    // Start update timer for live data indicator
    function startUpdateTimer() {
        // Clear existing timer if any
        if (window.updateTimer) {
            clearInterval(window.updateTimer);
        }
        
        let seconds = 0;
        const updateTimeElement = document.querySelector('.update-time');
        
        window.updateTimer = setInterval(() => {
            seconds += 1;
            
            if (seconds < 60) {
                updateTimeElement.textContent = `Updated ${seconds} second${seconds !== 1 ? 's' : ''} ago`;
            } else {
                const minutes = Math.floor(seconds / 60);
                updateTimeElement.textContent = `Updated ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            }
        }, 1000);
    }
    
    // Setup real-time route updates
    function setupRealTimeUpdates(startCoords, endCoords, departureTime) {
        // Clear existing interval if any
        if (window.routeRefreshInterval) {
            clearInterval(window.routeRefreshInterval);
        }
        
        // Set interval for real-time updates (every 30 seconds)
        window.routeRefreshInterval = setInterval(() => {
            // Check if modal is still open
            if (routePlannerModal.style.display === 'block') {
                // Get current selected route
                const selectedRouteIndex = window.selectedRouteIndex || 0;
                
                // Refresh route data with subtle changes to simulate real-time updates
                refreshRouteData(startCoords, endCoords, departureTime, selectedRouteIndex);
            } else {
                // Stop updating if modal is closed
                clearInterval(window.routeRefreshInterval);
            }
        }, 30000); // Update every 30 seconds
    }
    
    // Refresh route data to simulate real-time changes
    function refreshRouteData(startCoords, endCoords, departureTime, selectedRouteIndex) {
        // In a real app, this would call the routing API again
        // For demo, we'll just simulate small changes in traffic conditions
        
        // Get all route options
        const routeOptions = document.querySelectorAll('.route-option');
        if (routeOptions.length === 0) return;
        
        // Update each route with small random changes
        routeOptions.forEach((option, index) => {
            // Get current duration and randomly adjust it
            const durationElement = option.querySelector('.route-time');
            let currentDuration = parseInt(durationElement.textContent);
            
            // Random adjustment between -2 and +3 minutes
            const adjustment = Math.floor(Math.random() * 6) - 2;
            const newDuration = Math.max(5, currentDuration + adjustment); // Ensure at least 5 minutes
            
            // Update duration
            durationElement.textContent = `${newDuration} min`;
            
            // Determine if traffic level changed
            const trafficIndicator = option.querySelector('.route-traffic-indicator');
            const detailsElement = option.querySelector('.route-details');
            let trafficLevel = '';
            
            if (trafficIndicator.classList.contains('traffic-low')) {
                trafficLevel = 'light';
            } else if (trafficIndicator.classList.contains('traffic-medium')) {
                trafficLevel = 'moderate';
            } else {
                trafficLevel = 'heavy';
            }
            
            // Occasionally change traffic level
            if (Math.random() < 0.3) {
                const levels = ['light', 'moderate', 'heavy'];
                const currentIndex = levels.indexOf(trafficLevel);
                let newIndex;
                
                // More likely to worsen than improve
                if (Math.random() < 0.7 && currentIndex < 2) {
                    newIndex = currentIndex + 1; // Traffic gets worse
                } else if (currentIndex > 0) {
                    newIndex = currentIndex - 1; // Traffic improves
                } else {
                    newIndex = currentIndex;
                }
                
                const newTrafficLevel = levels[newIndex];
                
                // Update traffic indicator class
                trafficIndicator.className = 'route-traffic-indicator';
                trafficIndicator.classList.add(
                    newTrafficLevel === 'light' ? 'traffic-low' : 
                    newTrafficLevel === 'moderate' ? 'traffic-medium' : 'traffic-high'
                );
                
                // Update details text
                const detailsParts = detailsElement.textContent.split('·');
                detailsElement.textContent = `${newTrafficLevel.charAt(0).toUpperCase() + newTrafficLevel.slice(1)} traffic · ${detailsParts[1]}`;
            }
            
            // Update ETA
            const etaElement = option.querySelector('.route-eta');
            if (etaElement) {
                if (departureTime === 'now') {
                    etaElement.textContent = `${newDuration} minutes`;
                } else {
                    // Calculate new arrival time
                    const now = new Date();
                    const arrival = new Date(now.getTime() + (newDuration * 60 * 1000));
                    const timeString = arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    etaElement.textContent = `Arrive at ${timeString}`;
                }
            }
            
            // Add highlight animation if this is the selected route
            if (index === selectedRouteIndex) {
                option.classList.add('updating');
                setTimeout(() => {
                    option.classList.remove('updating');
                }, 2000);
            }
        });
        
        // Update the live data indicator
        const indicator = document.querySelector('.live-data-indicator');
        if (indicator) {
            // Reset update time
            const updateTime = indicator.querySelector('.update-time');
            updateTime.textContent = 'Updated just now';
            
            // Add pulse animation
            indicator.classList.add('pulse-update');
            setTimeout(() => {
                indicator.classList.remove('pulse-update');
            }, 2000);
            
            // Reset timer
            startUpdateTimer();
        }
        
        // Show subtle toast notification
        showToast('Routes Updated', 'Real-time traffic data has been refreshed', 'info');
    }
    
    // Open route in Waze
    function openInWaze() {
        const routeFrom = routeFromInput.value;
        const routeTo = routeToInput.value;
        
        // Try to extract coordinates
        let startLat, startLng, endLat, endLng;
        
        const startMatch = routeFrom.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
        if (startMatch) {
            startLat = startMatch[1];
            startLng = startMatch[2];
        }
        
        const endMatch = routeTo.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
        if (endMatch) {
            endLat = endMatch[1];
            endLng = endMatch[2];
        }
        
        // Build Waze URL
        let wazeUrl;
        if (startLat && startLng && endLat && endLng) {
            wazeUrl = `https://waze.com/ul?ll=${endLat},${endLng}&navigate=yes&from=${startLat},${startLng}`;
        } else {
            wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(routeTo)}&navigate=yes`;
        }
        
        // Show toast notification
        showToast('Opening Waze', 'Redirecting to Waze navigation...', 'info');
        
        // Open in new window
        window.open(wazeUrl, '_blank');
    }
});