// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin dashboard
    initAdminDashboard();
    
    // Set up tab navigation
    setupTabs();
    
    // Initialize the admin map
    initAdminMap();
    
    // Load initial data
    loadDashboardData();
    loadBusesData();
    loadStaffData();
    loadUsersData();
    
    // Set up event listeners for modals
    setupModalHandlers();
    
    // Set up form submissions
    setupFormHandlers();
    
    // Set up real-time updates
    setupRealTimeUpdates();
});

// Global variables
let adminMap;
let busMarkers = {};
let passengerMarkers = {};

/**
 * Initializes the admin dashboard components
 */
function initAdminDashboard() {
    // Set current date on admin dashboard
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set up refresh button
    document.getElementById('refresh-activity').addEventListener('click', function() {
        loadActivityData();
    });
    
    // Set up search functionality
    document.getElementById('bus-search').addEventListener('input', function() {
        filterTable('buses-table', this.value);
    });
    
    document.getElementById('staff-search').addEventListener('input', function() {
        filterTable('staff-table', this.value);
    });
    
    document.getElementById('user-search').addEventListener('input', function() {
        filterTable('users-table', this.value);
    });
    
    // Set up logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        window.location.href = 'index.html';
    });
}

/**
 * Updates the date and time display
 */
function updateDateTime() {
    const now = new Date();
    const dateTimeStr = now.toLocaleString();
    
    // Update all the timestamps in the dashboard
    document.getElementById('active-users-updated').textContent = dateTimeStr;
    document.getElementById('subscribers-updated').textContent = dateTimeStr;
    document.getElementById('buses-updated').textContent = dateTimeStr;
    document.getElementById('bookings-updated').textContent = dateTimeStr;
}

/**
 * Sets up tab navigation
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab content
            const tabName = this.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Refresh map if on dashboard tab
            if (tabName === 'dashboard' && adminMap) {
                adminMap.invalidateSize();
                updateBusLocations();
            }
        });
    });
}

/**
 * Initializes the admin map for bus tracking
 */
function initAdminMap() {
    // Create map in the admin-map div
    adminMap = L.map('admin-map').setView([40.7128, -74.0060], 13);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(adminMap);
    
    // Initial update of bus locations
    updateBusLocations();
    
    // Set interval to update bus locations every 10 seconds
    setInterval(updateBusLocations, 10000);
}

/**
 * Updates bus locations on the admin map
 */
function updateBusLocations() {
    // Fetch bus locations from the API
    simulateApiResponse('buses/locations')
        .then(data => {
            // Update bus markers on the map
            data.buses.forEach(bus => {
                updateBusMarker(bus);
            });
            
            // Update passenger markers
            if (data.passengers) {
                updatePassengerMarkers(data.passengers);
            }
        })
        .catch(error => {
            console.error('Error updating bus locations:', error);
        });
}

/**
 * Updates a bus marker on the admin map
 */
function updateBusMarker(bus) {
    // If marker already exists, update its position
    if (busMarkers[bus.id]) {
        busMarkers[bus.id].setLatLng([bus.position[0], bus.position[1]]);
        
        // Update popup content
        busMarkers[bus.id].setPopupContent(`
            <strong>Bus ID:</strong> ${bus.id}<br>
            <strong>Route:</strong> ${bus.route_id}<br>
            <strong>Speed:</strong> ${Math.round(bus.speed)} km/h<br>
            <strong>ETA:</strong> ${bus.eta}<br>
            <strong>Status:</strong> ${bus.is_moving ? 'Moving' : 'Stationary'}<br>
            <strong>Last updated:</strong> ${new Date(bus.last_updated * 1000).toLocaleTimeString()}
        `);
    } else {
        // Create a new marker
        const busIcon = L.divIcon({
            className: 'bus-marker',
            html: `<i class="fas fa-bus" style="color: #3498db; font-size: 24px;"></i>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([bus.position[0], bus.position[1]], {
            icon: busIcon,
            title: `Bus ${bus.id}`
        }).addTo(adminMap);
        
        marker.bindPopup(`
            <strong>Bus ID:</strong> ${bus.id}<br>
            <strong>Route:</strong> ${bus.route_id}<br>
            <strong>Speed:</strong> ${Math.round(bus.speed)} km/h<br>
            <strong>ETA:</strong> ${bus.eta}<br>
            <strong>Status:</strong> ${bus.is_moving ? 'Moving' : 'Stationary'}<br>
            <strong>Last updated:</strong> ${new Date(bus.last_updated * 1000).toLocaleTimeString()}
        `);
        
        busMarkers[bus.id] = marker;
    }
}

/**
 * Updates passenger markers on the admin map
 */
function updatePassengerMarkers(passengers) {
    // Remove old passenger markers
    Object.values(passengerMarkers).forEach(marker => {
        adminMap.removeLayer(marker);
    });
    
    passengerMarkers = {};
    
    // Add new passenger markers
    passengers.forEach(passenger => {
        const passengerIcon = L.divIcon({
            className: 'passenger-marker',
            html: `<i class="fas fa-user" style="color: #e74c3c; font-size: 16px;"></i>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        const marker = L.marker([passenger.position[0], passenger.position[1]], {
            icon: passengerIcon,
            title: passenger.name || 'Passenger'
        }).addTo(adminMap);
        
        marker.bindPopup(`
            <strong>Passenger:</strong> ${passenger.name || 'Anonymous'}<br>
            <strong>Waiting since:</strong> ${new Date(passenger.last_updated * 1000).toLocaleTimeString()}
        `);
        
        passengerMarkers[passenger.id] = marker;
    });
}

/**
 * Loads dashboard data from the API
 */
function loadDashboardData() {
    simulateApiResponse('dashboard')
        .then(data => {
            // Update dashboard cards
            document.getElementById('active-users-count').textContent = data.active_users.count;
            document.getElementById('active-users-change').textContent = `${data.active_users.change}%`;
            
            document.getElementById('subscribers-count').textContent = data.subscribers.count;
            document.getElementById('subscribers-change').textContent = `${data.subscribers.change}%`;
            
            document.getElementById('active-buses-count').textContent = data.buses.count;
            document.getElementById('buses-status').textContent = `${data.buses.active_count} buses currently on route`;
            
            document.getElementById('bookings-count').textContent = data.bookings.count;
            
            const bookingTrend = document.getElementById('booking-trend');
            if (data.bookings.change > 0) {
                bookingTrend.classList.add('positive');
                bookingTrend.classList.remove('negative');
                bookingTrend.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${data.bookings.change}%</span> from yesterday`;
            } else if (data.bookings.change < 0) {
                bookingTrend.classList.add('negative');
                bookingTrend.classList.remove('positive');
                bookingTrend.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${Math.abs(data.bookings.change)}%</span> from yesterday`;
            } else {
                bookingTrend.classList.remove('positive', 'negative');
                bookingTrend.innerHTML = `<i class="fas fa-equals"></i> <span>0%</span> from yesterday`;
            }
            
            // Load activity data
            loadActivityData();
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
        });
}

/**
 * Loads activity data for the dashboard
 */
function loadActivityData() {
    simulateApiResponse('activity')
        .then(data => {
            const tableBody = document.querySelector('#activity-table tbody');
            tableBody.innerHTML = '';
            
            data.activities.forEach(activity => {
                const row = document.createElement('tr');
                
                const timeCell = document.createElement('td');
                timeCell.textContent = new Date(activity.timestamp * 1000).toLocaleString();
                
                const activityCell = document.createElement('td');
                activityCell.textContent = activity.type;
                
                const userCell = document.createElement('td');
                userCell.textContent = activity.user || 'Anonymous';
                
                const detailsCell = document.createElement('td');
                detailsCell.textContent = activity.details;
                
                row.appendChild(timeCell);
                row.appendChild(activityCell);
                row.appendChild(userCell);
                row.appendChild(detailsCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading activity data:', error);
        });
}

/**
 * Loads buses data for the buses tab
 */
function loadBusesData() {
    simulateApiResponse('buses')
        .then(data => {
            const tableBody = document.querySelector('#buses-table tbody');
            tableBody.innerHTML = '';
            
            // Populate bus driver select in the add bus form
            const driverSelect = document.getElementById('bus-driver');
            driverSelect.innerHTML = '<option value="">Select a driver</option>';
            
            if (data.drivers) {
                data.drivers.forEach(driver => {
                    const option = document.createElement('option');
                    option.value = driver.id;
                    option.textContent = driver.name;
                    driverSelect.appendChild(option);
                });
            }
            
            data.buses.forEach(bus => {
                const row = document.createElement('tr');
                
                const idCell = document.createElement('td');
                idCell.textContent = bus.id;
                
                const routeCell = document.createElement('td');
                routeCell.textContent = bus.route_id;
                
                const capacityCell = document.createElement('td');
                capacityCell.textContent = bus.capacity;
                
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `status-badge ${bus.is_moving ? 'active' : 'inactive'}`;
                statusBadge.textContent = bus.is_moving ? 'Active' : 'Inactive';
                statusCell.appendChild(statusBadge);
                
                const driverCell = document.createElement('td');
                driverCell.textContent = bus.driver || 'Unassigned';
                
                const locationCell = document.createElement('td');
                locationCell.textContent = bus.last_location || 'Unknown';
                
                const actionsCell = document.createElement('td');
                
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = 'Edit Bus';
                editBtn.onclick = function() {
                    editBus(bus.id);
                };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Delete Bus';
                deleteBtn.onclick = function() {
                    deleteBus(bus.id);
                };
                
                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
                
                row.appendChild(idCell);
                row.appendChild(routeCell);
                row.appendChild(capacityCell);
                row.appendChild(statusCell);
                row.appendChild(driverCell);
                row.appendChild(locationCell);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading buses data:', error);
        });
}

/**
 * Loads staff data for the drivers tab
 */
function loadStaffData() {
    simulateApiResponse('staff')
        .then(data => {
            const tableBody = document.querySelector('#staff-table tbody');
            tableBody.innerHTML = '';
            
            data.staff.forEach(staff => {
                const row = document.createElement('tr');
                
                const idCell = document.createElement('td');
                idCell.textContent = staff.id;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = staff.name;
                
                const roleCell = document.createElement('td');
                roleCell.textContent = staff.role;
                
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `status-badge ${staff.status === 'active' ? 'active' : 'inactive'}`;
                statusBadge.textContent = staff.status;
                statusCell.appendChild(statusBadge);
                
                const contactCell = document.createElement('td');
                contactCell.textContent = staff.contact;
                
                const busCell = document.createElement('td');
                busCell.textContent = staff.assigned_bus || 'None';
                
                const actionsCell = document.createElement('td');
                
                const editBtn = document.createElement('button');
                editBtn.className = 'action-btn';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = 'Edit Staff';
                editBtn.onclick = function() {
                    editStaff(staff.id);
                };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Delete Staff';
                deleteBtn.onclick = function() {
                    deleteStaff(staff.id);
                };
                
                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
                
                row.appendChild(idCell);
                row.appendChild(nameCell);
                row.appendChild(roleCell);
                row.appendChild(statusCell);
                row.appendChild(contactCell);
                row.appendChild(busCell);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading staff data:', error);
        });
}

/**
 * Loads users data for the users tab
 */
function loadUsersData() {
    simulateApiResponse('users')
        .then(data => {
            const tableBody = document.querySelector('#users-table tbody');
            tableBody.innerHTML = '';
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                
                const idCell = document.createElement('td');
                idCell.textContent = user.id;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = user.name;
                
                const phoneCell = document.createElement('td');
                phoneCell.textContent = user.phone;
                
                const emailCell = document.createElement('td');
                emailCell.textContent = user.email || 'N/A';
                
                const subscriptionCell = document.createElement('td');
                if (user.subscription) {
                    const subscriptionBadge = document.createElement('span');
                    subscriptionBadge.className = 'subscription-badge';
                    subscriptionBadge.textContent = user.subscription;
                    subscriptionCell.appendChild(subscriptionBadge);
                } else {
                    subscriptionCell.textContent = 'None';
                }
                
                const lastActivityCell = document.createElement('td');
                lastActivityCell.textContent = user.last_activity 
                    ? new Date(user.last_activity * 1000).toLocaleString()
                    : 'Never';
                
                const actionsCell = document.createElement('td');
                
                const viewBtn = document.createElement('button');
                viewBtn.className = 'action-btn';
                viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
                viewBtn.title = 'View User Details';
                viewBtn.onclick = function() {
                    viewUser(user.id);
                };
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = 'Delete User';
                deleteBtn.onclick = function() {
                    deleteUser(user.id);
                };
                
                actionsCell.appendChild(viewBtn);
                actionsCell.appendChild(deleteBtn);
                
                row.appendChild(idCell);
                row.appendChild(nameCell);
                row.appendChild(phoneCell);
                row.appendChild(emailCell);
                row.appendChild(subscriptionCell);
                row.appendChild(lastActivityCell);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading users data:', error);
        });
}

/**
 * Filters a table based on search input
 */
function filterTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');
    
    searchTerm = searchTerm.toLowerCase();
    
    // Start from 1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent || cells[j].innerText;
            
            if (cellText.toLowerCase().indexOf(searchTerm) > -1) {
                found = true;
                break;
            }
        }
        
        if (found) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

/**
 * Sets up modal handlers
 */
function setupModalHandlers() {
    // Get all modals
    const modals = document.querySelectorAll('.modal');
    
    // Get all elements that open a modal
    const modalTriggers = [
        { trigger: 'add-bus-btn', modal: 'add-bus-modal' },
        { trigger: 'add-driver-btn', modal: 'add-staff-modal' },
        { trigger: 'add-plan-btn', modal: 'add-plan-modal' }
    ];
    
    // Set up click handlers for each modal trigger
    modalTriggers.forEach(item => {
        const trigger = document.getElementById(item.trigger);
        const modal = document.getElementById(item.modal);
        
        if (trigger && modal) {
            trigger.addEventListener('click', function() {
                modal.style.display = 'block';
            });
        }
    });
    
    // Set up close button handlers for all modals
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside of it
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Sets up form submission handlers
 */
function setupFormHandlers() {
    // Add Bus Form
    const addBusForm = document.getElementById('add-bus-form');
    if (addBusForm) {
        addBusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const busId = document.getElementById('bus-id').value;
            const busRoute = document.getElementById('bus-route').value;
            const busCapacity = document.getElementById('bus-capacity').value;
            const busDriver = document.getElementById('bus-driver').value;
            
            // Send data to the server 
            // In development mode, we'll simulate a successful response
            // In production, replace this with actual API calls
            setTimeout(() => {
                // Close the modal
                document.getElementById('add-bus-modal').style.display = 'none';
                
                // Reset the form
                addBusForm.reset();
                
                // Reload buses data
                loadBusesData();
                
                // Show success message
                alert('Bus added successfully!');
            }, 700);
        });
    }
    
    // Add Staff Form
    const addStaffForm = document.getElementById('add-staff-form');
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const staffName = document.getElementById('staff-name').value;
            const staffRole = document.getElementById('staff-role').value;
            const staffContact = document.getElementById('staff-contact').value;
            const staffEmail = document.getElementById('staff-email').value;
            const staffUsername = document.getElementById('staff-username').value;
            const staffPassword = document.getElementById('staff-password').value;
            
            // Simulate successful response
            setTimeout(() => {
                // Close the modal
                document.getElementById('add-staff-modal').style.display = 'none';
                
                // Reset the form
                addStaffForm.reset();
                
                // Reload staff data
                loadStaffData();
                
                // Show success message
                alert('Staff added successfully!');
            }, 700);
        });
    }
    
    // Add Subscription Plan Form
    const addPlanForm = document.getElementById('add-plan-form');
    if (addPlanForm) {
        addPlanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const planName = document.getElementById('plan-name').value;
            const planPrice = document.getElementById('plan-price').value;
            const planFeatures = document.getElementById('plan-features').value;
            
            // Parse features from textarea (one per line)
            const features = planFeatures.split('\n').filter(feature => feature.trim() !== '');
            
            // Simulate successful response
            setTimeout(() => {
                // Close the modal
                document.getElementById('add-plan-modal').style.display = 'none';
                
                // Reset the form
                addPlanForm.reset();
                
                // Add the new subscription plan to the UI
                addSubscriptionPlan(planName, planPrice, features);
                
                // Show success message
                alert('Subscription plan added successfully!');
            }, 700);
        });
    }
}

/**
 * Sets up real-time updates for the admin dashboard
 */
function setupRealTimeUpdates() {
    // Check if the EventSource API is available
    if (typeof EventSource !== 'undefined') {
        // Connect to the server-sent events endpoint
        const source = new EventSource('/api/admin/events');
        
        // Listen for dashboard updates
        source.addEventListener('dashboard_update', function(e) {
            const data = JSON.parse(e.data);
            updateDashboardData(data);
        });
        
        // Listen for bus location updates
        source.addEventListener('bus_location', function(e) {
            const data = JSON.parse(e.data);
            updateBusMarker(data);
        });
        
        // Listen for passenger updates
        source.addEventListener('passenger_update', function(e) {
            const data = JSON.parse(e.data);
            updatePassengerMarkers(data.passengers);
        });
        
        // Listen for new bookings
        source.addEventListener('new_booking', function(e) {
            const data = JSON.parse(e.data);
            // Update booking count
            const bookingsCount = document.getElementById('bookings-count');
            bookingsCount.textContent = parseInt(bookingsCount.textContent) + 1;
            
            // Add to activity table if visible
            if (document.getElementById('dashboard-tab').classList.contains('active')) {
                addActivityRow({
                    timestamp: Math.floor(Date.now() / 1000),
                    type: 'New Booking',
                    user: data.name,
                    details: `Booked ${data.seats.length} seats`
                });
            }
        });
        
        // Listen for new subscriptions
        source.addEventListener('new_subscription', function(e) {
            const data = JSON.parse(e.data);
            // Update subscribers count
            const subscribersCount = document.getElementById('subscribers-count');
            subscribersCount.textContent = parseInt(subscribersCount.textContent) + 1;
            
            // Add to activity table if visible
            if (document.getElementById('dashboard-tab').classList.contains('active')) {
                addActivityRow({
                    timestamp: Math.floor(Date.now() / 1000),
                    type: 'New Subscription',
                    user: data.name,
                    details: `Subscribed to ${data.plan}`
                });
            }
        });
        
        // Handle connection errors
        source.onerror = function() {
            console.error('EventSource connection error. Reconnecting in 5 seconds...');
            source.close();
            setTimeout(setupRealTimeUpdates, 5000);
        };
    } else {
        // Fallback for browsers that don't support Server-Sent Events
        console.warn('Browser does not support Server-Sent Events. Falling back to polling.');
        
        // Set up polling every 30 seconds
        setInterval(function() {
            loadDashboardData();
            updateBusLocations();
        }, 30000);
    }
}

/**
 * Updates dashboard data with real-time information
 */
function updateDashboardData(data) {
    if (data.active_users) {
        document.getElementById('active-users-count').textContent = data.active_users.count;
        document.getElementById('active-users-change').textContent = `${data.active_users.change}%`;
    }
    
    if (data.subscribers) {
        document.getElementById('subscribers-count').textContent = data.subscribers.count;
        document.getElementById('subscribers-change').textContent = `${data.subscribers.change}%`;
    }
    
    if (data.buses) {
        document.getElementById('active-buses-count').textContent = data.buses.count;
        document.getElementById('buses-status').textContent = `${data.buses.active_count} buses currently on route`;
    }
    
    if (data.bookings) {
        document.getElementById('bookings-count').textContent = data.bookings.count;
        
        const bookingTrend = document.getElementById('booking-trend');
        if (data.bookings.change > 0) {
            bookingTrend.classList.add('positive');
            bookingTrend.classList.remove('negative');
            bookingTrend.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${data.bookings.change}%</span> from yesterday`;
        } else if (data.bookings.change < 0) {
            bookingTrend.classList.add('negative');
            bookingTrend.classList.remove('positive');
            bookingTrend.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${Math.abs(data.bookings.change)}%</span> from yesterday`;
        } else {
            bookingTrend.classList.remove('positive', 'negative');
            bookingTrend.innerHTML = `<i class="fas fa-equals"></i> <span>0%</span> from yesterday`;
        }
    }
    
    // Update timestamp
    updateDateTime();
}

/**
 * Adds a new activity row to the activity table
 */
function addActivityRow(activity) {
    const tableBody = document.querySelector('#activity-table tbody');
    
    // Create a new row at the top
    const row = document.createElement('tr');
    
    const timeCell = document.createElement('td');
    timeCell.textContent = new Date(activity.timestamp * 1000).toLocaleString();
    
    const activityCell = document.createElement('td');
    activityCell.textContent = activity.type;
    
    const userCell = document.createElement('td');
    userCell.textContent = activity.user || 'Anonymous';
    
    const detailsCell = document.createElement('td');
    detailsCell.textContent = activity.details;
    
    row.appendChild(timeCell);
    row.appendChild(activityCell);
    row.appendChild(userCell);
    row.appendChild(detailsCell);
    
    // Add the new row at the top
    if (tableBody.firstChild) {
        tableBody.insertBefore(row, tableBody.firstChild);
    } else {
        tableBody.appendChild(row);
    }
    
    // Remove the last row if there are more than 10 rows
    const rows = tableBody.getElementsByTagName('tr');
    if (rows.length > 10) {
        tableBody.removeChild(rows[rows.length - 1]);
    }
}

/**
 * CRUD Operations for buses
 */
function editBus(busId) {
    // Implement edit bus functionality
    alert(`Edit bus with ID: ${busId}`);
}

function deleteBus(busId) {
    if (confirm(`Are you sure you want to delete bus ${busId}?`)) {
        fetch(`/api/admin/buses/delete/${busId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete bus');
            }
            return response.json();
        })
        .then(data => {
            loadBusesData();
            alert('Bus deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting bus:', error);
            alert('Failed to delete bus. Please try again.');
        });
    }
}

/**
 * CRUD Operations for staff
 */
function editStaff(staffId) {
    // Implement edit staff functionality
    alert(`Edit staff with ID: ${staffId}`);
}

function deleteStaff(staffId) {
    if (confirm(`Are you sure you want to delete this staff member?`)) {
        fetch(`/api/admin/staff/delete/${staffId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete staff');
            }
            return response.json();
        })
        .then(data => {
            loadStaffData();
            alert('Staff deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting staff:', error);
            alert('Failed to delete staff. Please try again.');
        });
    }
}

/**
 * User operations
 */
function viewUser(userId) {
    // Implement view user functionality
    alert(`View user with ID: ${userId}`);
}

function deleteUser(userId) {
    if (confirm(`Are you sure you want to delete this user?`)) {
        fetch(`/api/admin/users/delete/${userId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete user');
            }
            return response.json();
        })
        .then(data => {
            loadUsersData();
            alert('User deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. Please try again.');
        });
    }
}

/**
 * Simulates API calls for development purposes
 * In production, replace these with actual API calls
 */
function simulateApiResponse(endpoint) {
    // Common delay to simulate network latency
    const delay = 700;
    
    switch (endpoint) {
        case 'dashboard':
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        active_users: {
                            count: Math.floor(Math.random() * 500) + 100,
                            change: Math.floor(Math.random() * 15) + 1
                        },
                        subscribers: {
                            count: Math.floor(Math.random() * 300) + 50,
                            change: Math.floor(Math.random() * 10) + 1
                        },
                        buses: {
                            count: Math.floor(Math.random() * 20) + 5,
                            active_count: Math.floor(Math.random() * 15) + 3
                        },
                        bookings: {
                            count: Math.floor(Math.random() * 200) + 50,
                            change: Math.floor(Math.random() * 20) - 10
                        }
                    });
                }, delay);
            });
        
        case 'buses':
            return new Promise(resolve => {
                setTimeout(() => {
                    const buses = [];
                    const routes = ['Downtown Loop', 'Airport Express', 'Suburban Route', 'University Line', 'East-West Connector'];
                    
                    for (let i = 1; i <= 10; i++) {
                        buses.push({
                            id: `BUS${100 + i}`,
                            route_id: routes[Math.floor(Math.random() * routes.length)],
                            capacity: Math.floor(Math.random() * 30) + 25,
                            is_moving: Math.random() > 0.3,
                            driver: `Driver ${i}`,
                            last_location: 'Main St & 5th Ave'
                        });
                    }
                    
                    resolve({
                        buses: buses,
                        drivers: [
                            { id: 1, name: 'John Smith' },
                            { id: 2, name: 'Jane Doe' },
                            { id: 3, name: 'Robert Johnson' }
                        ]
                    });
                }, delay);
            });
            
        case 'staff':
            return new Promise(resolve => {
                setTimeout(() => {
                    const staff = [];
                    const roles = ['driver', 'conductor', 'admin'];
                    const statuses = ['active', 'inactive'];
                    
                    for (let i = 1; i <= 8; i++) {
                        staff.push({
                            id: i,
                            name: `Staff ${i}`,
                            role: roles[Math.floor(Math.random() * roles.length)],
                            status: statuses[Math.floor(Math.random() * statuses.length)],
                            contact: `+1-555-${100 + i}-${1000 + i}`,
                            assigned_bus: Math.random() > 0.3 ? `BUS${100 + Math.floor(Math.random() * 10) + 1}` : null
                        });
                    }
                    
                    resolve({ staff });
                }, delay);
            });
            
        case 'users':
            return new Promise(resolve => {
                setTimeout(() => {
                    const users = [];
                    const subscriptions = [null, 'Basic', 'Premium', 'Business'];
                    
                    for (let i = 1; i <= 15; i++) {
                        users.push({
                            id: i,
                            name: `User ${i}`,
                            phone: `+1-555-${200 + i}-${2000 + i}`,
                            email: `user${i}@example.com`,
                            subscription: subscriptions[Math.floor(Math.random() * subscriptions.length)],
                            last_activity: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7)
                        });
                    }
                    
                    resolve({ users });
                }, delay);
            });
            
        case 'activity':
            return new Promise(resolve => {
                setTimeout(() => {
                    const activities = [];
                    const types = ['New Booking', 'Login', 'Subscription Purchase', 'Route Search', 'Feedback Submitted'];
                    
                    for (let i = 1; i <= 10; i++) {
                        activities.push({
                            timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600 * i),
                            type: types[Math.floor(Math.random() * types.length)],
                            user: `User ${Math.floor(Math.random() * 20) + 1}`,
                            details: `Details for activity ${i}`
                        });
                    }
                    
                    resolve({ activities });
                }, delay);
            });
            
        case 'buses/locations':
            return new Promise(resolve => {
                setTimeout(() => {
                    const buses = [];
                    const center = [40.7128, -74.0060]; // NYC coordinates
                    
                    for (let i = 1; i <= 10; i++) {
                        // Generate random position around the center
                        const lat = center[0] + (Math.random() - 0.5) * 0.1;
                        const lng = center[1] + (Math.random() - 0.5) * 0.1;
                        
                        buses.push({
                            id: `BUS${100 + i}`,
                            position: [lat, lng],
                            speed: Math.random() * 60,
                            eta: '10 min',
                            is_moving: Math.random() > 0.3,
                            route_id: `Route ${i}`,
                            last_updated: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 300)
                        });
                    }
                    
                    // Generate some random passenger positions
                    const passengers = [];
                    for (let i = 1; i <= 5; i++) {
                        const lat = center[0] + (Math.random() - 0.5) * 0.1;
                        const lng = center[1] + (Math.random() - 0.5) * 0.1;
                        
                        passengers.push({
                            id: i,
                            name: `Passenger ${i}`,
                            position: [lat, lng],
                            last_updated: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 600)
                        });
                    }
                    
                    resolve({ buses, passengers });
                }, delay);
            });
            
        default:
            return Promise.reject(new Error(`Unknown endpoint: ${endpoint}`));
    }
}

/**
 * Adds a new subscription plan to the UI
 */
function addSubscriptionPlan(name, price, features) {
    const plansContainer = document.querySelector('#subscriptions-tab .dashboard-cards');
    
    // Create a new card for the subscription plan
    const card = document.createElement('div');
    card.className = 'card';
    
    // Create card header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const cardIcon = document.createElement('div');
    cardIcon.className = 'card-icon';
    cardIcon.innerHTML = '<i class="fas fa-star"></i>';
    
    const cardTitle = document.createElement('h3');
    cardTitle.className = 'card-title';
    cardTitle.textContent = name;
    
    cardHeader.appendChild(cardIcon);
    cardHeader.appendChild(cardTitle);
    
    // Create card value (price)
    const cardValue = document.createElement('div');
    cardValue.className = 'card-value';
    cardValue.textContent = `$${parseFloat(price).toFixed(2)}/month`;
    
    // Create card description with features list
    const cardDescription = document.createElement('div');
    cardDescription.className = 'card-description';
    
    const featuresList = document.createElement('ul');
    features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
    });
    
    cardDescription.appendChild(featuresList);
    
    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-plan-btn action-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.onclick = function() {
        alert(`Edit plan: ${name}`);
    };
    
    // Assemble the card
    card.appendChild(cardHeader);
    card.appendChild(cardValue);
    card.appendChild(cardDescription);
    card.appendChild(editBtn);
    
    // Add the card to the container
    plansContainer.appendChild(card);
    
    // Add to subscription stats table
    const statsTable = document.getElementById('subscription-stats-table');
    const tbody = statsTable.getElementsByTagName('tbody')[0];
    
    const row = document.createElement('tr');
    
    const planCell = document.createElement('td');
    planCell.textContent = name;
    
    const subscribersCell = document.createElement('td');
    subscribersCell.textContent = '0';
    
    const revenueCell = document.createElement('td');
    revenueCell.textContent = '$0.00';
    
    const conversionCell = document.createElement('td');
    conversionCell.textContent = '0%';
    
    const retentionCell = document.createElement('td');
    retentionCell.textContent = '0 days';
    
    row.appendChild(planCell);
    row.appendChild(subscribersCell);
    row.appendChild(revenueCell);
    row.appendChild(conversionCell);
    row.appendChild(retentionCell);
    
    tbody.appendChild(row);
}