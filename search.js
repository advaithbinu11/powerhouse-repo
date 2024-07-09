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
    updateVendorsList();
});

calcValue();

let userLocation = null;
const infoContainer = document.querySelector('.info-container');
const infoContent = document.querySelector('.info-content');

// Geolocation API to find user's location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        userLocation = [lat, lon];

        // Update vendors list initially
        updateVendorsList(lat, lon, slider.value * 1609.34);
    }, function(error) {
        console.log("Geolocation failed: " + error.message);
    });
} else {
    console.log("Geolocation is not supported by this browser.");
}

async function updateVendorsList(lat = userLocation[0], lon = userLocation[1], radius = slider.value * 1609.34) {
    const requestBody = {
        address: `${lat},${lon}`, // Using latitude and longitude as address
        radius: radius / 1000 // Convert radius to kilometers
    };

    try {
        const response = await fetch('https://c91dhm43m2.execute-api.us-east-1.amazonaws.com/dev/getnearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        const jsonResponse = JSON.parse(data.body); // Store and parse the JSON response
        const listContainer = document.getElementById('list-container');
        listContainer.innerHTML = ''; // Clear existing list

        // Populate list with vendor locations
        if (jsonResponse.list) {
            jsonResponse.list.forEach(location => {
                const geohash = location.geohash;
                const latLng = decodeGeohash(geohash);
                if (latLng) {
                    const { lat, lng } = latLng;
                    const vendorName = location.vendor_name.replace(/^COA - /, ''); // Remove "COA - " prefix
                    const vendorAddress = location.vendor_address.split(",")[0]; // Extract the street address
                    const listItem = document.createElement('div');
                    listItem.className = 'list-item';
                    listItem.innerHTML = `
                        <div class="list-title">${vendorName}</div>
                        <div class="list-subtitle">${vendorAddress}</div>
                    `;
                    listItem.addEventListener('click', function() {
                        displayVendorInfo({
                            vendorName: vendorName,
                            vendorAddress: location.vendor_address,
                            vendorPhone: location.vendor_phone,
                            vendorId: location.vendor_id
                        }, [lat, lng]);
                    });
                    listContainer.appendChild(listItem);
                }
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

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
