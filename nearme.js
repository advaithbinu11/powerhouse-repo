let slider = document.getElementById("range");
let value = document.querySelector(".value");
value.innerHTML = slider.value; // Display the default slider value

function calcValue() {
    let valuePercentage = (slider.value / slider.max) * 100;
    slider.style.background = `linear-gradient(to right, #b01515 ${valuePercentage}%, #fff ${valuePercentage}%)`;
}

slider.addEventListener('input', function() {
    calcValue();
    value.textContent = this.value;
});

slider.addEventListener('change', function() {
    updateCircleRadius();
    updateVendorsOnMap();
});

calcValue();


function toggleMenu() {
    var menu = document.getElementById('menu');
    var menuIcon = document.getElementById('menu-icon');
    if (menu.style.display === 'flex') {
        menu.style.display = 'none';
        menuIcon.innerHTML = '&#9776;';
    } else {
        menu.style.display = 'flex';
        menuIcon.innerHTML = '&times;';
    }
}
// Initialize Leaflet map
var map = L.map('map').setView([30.26, -97.74], 12);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let circle;
let userMarker;
let userLocation = null;
let currentMarker = null;
const infoContainer = document.querySelector('.info-container');
const infoContent = document.querySelector('.info-content');

// Geolocation API to find user's location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        userLocation = [lat, lon];
        var myIcon = L.icon({
            iconUrl: 'perso.png',
            iconSize: [50, 50],
        });

        userMarker = L.marker(userLocation, {icon: myIcon}).addTo(map);
        map.setView(userLocation, 13);

        // Define the circle's center and radius (in meters)
        const circleRadius = slider.value * 1609.34; // Initialize with slider value in miles converted to meters

        // Add the circle to the map
        circle = L.circle(userLocation, {
            color: 'none', // No border color
            weight: 0, // No border weight
            fillColor: '#2288FF',
            fillOpacity: 0.2,
            radius: circleRadius
        }).addTo(map);

        // Update vendors on map initially
        updateVendorsOnMap(lat, lon, circleRadius);
    }, function(error) {
        console.log("Geolocation failed: " + error.message);
    });
} else {
    console.log("Geolocation is not supported by this browser.");
}
function updateAddress(event){
    const circleRadius = slider.value * 1609.34;
    var newAddress = document.getElementById("address").value;
    fetch("https://maps.googleapis.com/maps/api/geocode/json?address="+newAddress+"&key=AIzaSyBe8czoVF1c6W0SMR7VYA6dB58aiByQSjE").then(response=>response.json()).then(data=>{
    var newlat = data["results"][0].geometry.location.lat;
    var newlon = data["results"][0].geometry.location.lng;
    map.flyTo(new L.LatLng(newlat, newlon));
    circle.setLatLng([newlat, newlon]);
    userMarker.setLatLng([newlat, newlon]);
    updateVendorsOnMap(newlat, newlon, circleRadius);
    userLocation = [newlat, newlon];
})
}
function updateCircleRadius() {
    if (circle) {
        const newRadius = slider.value * 1609.34; // Convert miles to meters
        circle.setRadius(newRadius);
        updateVendorsOnMap(circle.getLatLng().lat, circle.getLatLng().lng, newRadius);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // Function to read and parse the CSV file using PapaParse
    Papa.parse("data.csv", {
        download: true,
        header: true,
        complete: function(results) {
            // Process the parsed CSV data
            const csvData = results.data;
            updateVendorsList(csvData);
        }
    });

    function updateVendorsList(data) {
        const listContainer = document.getElementById('list-container');
        listContainer.innerHTML = ''; // Clear existing list

        // Filter the list based on geohash and radius
        data.forEach(location => {
            const geohash = location.Geohash;
            const latLng = decodeGeohash(geohash);
            if (latLng) {
                const { lat, lng } = latLng;
                const vendorName = location["Name of Food Truck"].replace(/^COA - /, ''); // Remove "COA - " prefix
                const vendorAddress = location.Address.split(",")[0]; // Extract the street address
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.innerHTML = `
                    <div class="list-title">${vendorName}</div>
                    <div class="list-subtitle">${vendorAddress}</div>
                `;
                listItem.addEventListener('click', function() {
                    displayVendorInfo({
                        vendorName: vendorName,
                        vendorAddress: location.Address,
                        vendorPhone: location["Phone Number"],
                        vendorId: location["Vendor ID"]
                    }, [lat, lng]);
                });
                listContainer.appendChild(listItem);
            }
        });
    }

    function displayVendorInfo(vendor, vendorLocation) {
        const infoContainer = document.querySelector('.info-container');
        infoContainer.classList.add('active');
        document.getElementById('vendorName').textContent = `Name: ${vendor.vendorName}`;
        document.getElementById('vendorAddress').textContent = `Address: ${vendor.vendorAddress}`;
        document.getElementById('vendorPhone').textContent = `Phone: ${vendor.vendorPhone}`;
        document.getElementById('vendorId').textContent = `ID: ${vendor.vendorId}`;

        if (userLocation) {
            const distance = haversine(userLocation, vendorLocation).toFixed(2);
            document.getElementById('distance').textContent = `Distance: ${distance} miles`;
        }
    }

    function filterList() {
        const searchTerm = document.getElementById('search-bar').value.toLowerCase();
        const listItems = document.querySelectorAll('.list-item');

        listItems.forEach(item => {
            const title = item.querySelector('.list-title').textContent.toLowerCase();
            const subtitle = item.querySelector('.list-subtitle').textContent.toLowerCase();
            if (title.includes(searchTerm) || subtitle.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function decodeGeohash(geohash) {
        const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
        const bits = [16, 8, 4, 2, 1];
        let even = true;
        let lat = [-90.0, 90.0];
        let lon = [-180.0, 180.0];

        for (let i = 0; i < geohash.length; i++) {
            const chr = geohash[i];
            const idx = base32.indexOf(chr);
            for (let z = 0; z < 5; z++) {
                const bit = bits[z];
                if (even) {
                    const mid = (lon[0] + lon[1]) / 2;
                    if (idx & bit) {
                        lon[0] = mid;
                    } else {
                        lon[1] = mid;
                    }
                } else {
                    const mid = (lat[0] + lat[1]) / 2;
                    if (idx & bit) {
                        lat[0] = mid;
                    } else {
                        lat[1] = mid;
                    }
                }
                even = !even;
            }
        }
        return {
            lat: (lat[0] + lat[1]) / 2,
            lng: (lon[0] + lon[1]) / 2
        };
    }

    function haversine([lat1, lon1], [lat2, lon2]) {
        const toRadians = angle => (angle * Math.PI) / 180;
        const R = 3958.8; // Radius of the Earth in miles

        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in miles
    }
});



function displayVendorInfo(vendor, vendorLocation) {
    infoContainer.classList.add('active');
    document.getElementById('vendorName').textContent = `Name: ${vendor.vendorName}`;
    document.getElementById('vendorAddress').textContent = `Address: ${vendor.vendorAddress}`;
    document.getElementById('vendorPhone').textContent = `Phone: ${vendor.vendorPhone}`;
    document.getElementById('vendorId').textContent = `ID: ${vendor.vendorId}`;
    if (userLocation) {
        const distance = haversine(userLocation, vendorLocation).toFixed(2);
        document.getElementById('distance').textContent = `Distance: ${distance} miles`;
    }
}

function hideVendorInfo() {
    infoContainer.classList.remove('active');
    document.getElementById('vendorName').textContent = '';
    document.getElementById('vendorAddress').textContent = '';
    document.getElementById('vendorPhone').textContent = '';
    document.getElementById('vendorId').textContent = '';
    document.getElementById('distance').textContent = '';
}

function decodeGeohash(geohash) {
    // A simple function to decode geohash to latitude and longitude
    const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    const bits = [16, 8, 4, 2, 1];
    let even = true;
    let lat = [-90.0, 90.0];
    let lon = [-180.0, 180.0];

    for (let i = 0; i < geohash.length; i++) {
        const chr = geohash[i];
        const idx = base32.indexOf(chr);
        for (let z = 0; z < 5; z++) {
            const bit = bits[z];
            if (even) {
                const mid = (lon[0] + lon[1]) / 2;
                if (idx & bit) {
                    lon[0] = mid;
                } else {
                    lon[1] = mid;
                }
            } else {
                const mid = (lat[0] + lat[1]) / 2;
                if (idx & bit) {
                    lat[0] = mid;
                } else {
                    lat[1] = mid;
                }
            }
            even = !even;
        }
    }
    return {
        lat: (lat[0] + lat[1]) / 2,
        lng: (lon[0] + lon[1]) / 2
    };
}

function haversine([lat1, lon1], [lat2, lon2]) {
    const toRadians = angle => (angle * Math.PI) / 180;
    const R = 3958.8; // Radius of the Earth in miles

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in miles
}
