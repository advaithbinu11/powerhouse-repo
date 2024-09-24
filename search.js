let slider = document.getElementById("range");
let value = document.querySelector(".value");
value.innerHTML = slider.value; // Display the default slider value

function calcValue() {
    let valuePercentage = (slider.value / slider.max) * 100;
    slider.style.background = `linear-gradient(to right, #b01515 ${valuePercentage}%, #fff ${valuePercentage}%)`;
}

slider.addEventListener('input', function () {
    calcValue();
    value.textContent = this.value;
});

slider.addEventListener('change', function () {
    updateVendorsList();
});

calcValue();

let userLocation = null;
let vendorData = null; // Store parsed CSV data
const infoContainer = document.querySelector('.info-container');

// Geolocation API to find user's location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        userLocation = [lat, lon];

        // Update vendors list initially
        updateVendorsList(lat, lon, slider.value * 1609.34);
    }, function (error) {
        console.log("Geolocation failed: " + error.message);
    });
} else {
    console.log("Geolocation is not supported by this browser.");
}

// Function to load and parse CSV file
document.getElementById('data.csv').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            complete: function (results) {
                vendorData = results.data; // Store parsed data
                updateVendorsList();
            }
        });
    }
});

async function updateVendorsList(lat = userLocation[0], lon = userLocation[1], radius = slider.value * 1609.34) {
    if (!vendorData) {
        console.log('No vendor data loaded');
        return;
    }

    const listContainer = document.getElementById('list-container');
    listContainer.innerHTML = ''; // Clear existing list

    // Populate list with vendor locations
    vendorData.forEach(location => {
        const geohash = location.Geohash;
        const latLng = decodeGeohash(geohash);
        if (latLng) {
            const { lat, lng } = latLng;
            const vendorName = location["Name of Food Truck"].replace(/^COA - /, ''); // Remove "COA - " prefix
            const vendorAddress = location.Address.split(",")[0]; // Extract street address
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div class="list-title">${vendorName}</div>
                <div class="list-subtitle">${vendorAddress}</div>
                <div class="list-details">Permit: ${location.permitType}, Last Checkup: ${location.lastCheckup}</div>
            `;
            listItem.addEventListener('click', function () {
                displayVendorInfo({
                    vendorName: vendorName,
                    vendorAddress: location.Address,
                    vendorPhone: location["Phone Number"],
                    vendorId: location["Vendor ID"],
                    permitType: location.permitType,
                    lastCheckup: location.lastCheckup
                }, [lat, lng]);
            });
            listContainer.appendChild(listItem);
        }
    });
}

function displayVendorInfo(vendor, vendorLocation) {
    infoContainer.classList.add('active');
    document.getElementById('vendorName').textContent = `Name: ${vendor.vendorName}`;
    document.getElementById('vendorAddress').textContent = `Address: ${vendor.vendorAddress}`;
    document.getElementById('vendorPhone').textContent = `Phone: ${vendor.vendorPhone}`;
    document.getElementById('vendorId').textContent = `ID: ${vendor.vendorId}`;
    document.getElementById('vendorPermitType').textContent = `Permit: ${vendor.permitType}`;
    document.getElementById('vendorLastCheckup').textContent = `Last Checkup: ${vendor.lastCheckup}`;
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
