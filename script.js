const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = document.getElementById('zoneFrame');
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');

const zonesURL = "https://raw.githubusercontent.com/ten8mystery/Holy-Salmon/refs/heads/main/data/zones.json";
const coverURL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const htmlURL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
const NewhtmlURL = "https://raw.githubusercontent.com/ten8mystery/Holy-Salmon-New-Html-Games-/refs/heads/main/";

let zones = [];
let popularityData = {};

async function listZones() {
    try {
        const response = await fetch(zonesURL + "?t=" + Date.now());
        const json = await response.json();
        zones = json;
        await fetchPopularity();
        sortZones();
        const search = new URLSearchParams(window.location.search);
        const id = search.get('id');
        if (id) {
            const zone = zones.find(zone => zone.id + '' == id + '');
            if (zone) openZone(zone);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `Error loading zones: ${error}`;
    }
}

async function fetchPopularity() {
    try {
        const response = await fetch("https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=year");
        const data = await response.json();
        data.forEach(file => {
            const idMatch = file.name.match(/\/(\d+)\.html$/);
            if (idMatch) {
                const id = parseInt(idMatch[1]);
                popularityData[id] = file.hits.total;
            }
        });
    } catch (error) {
        popularityData[0] = 0;
    }
}

function sortZones() {
    const sortBy = sortOptions.value;
    if (sortBy === 'name') {
        zones.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'id') {
        zones.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'popular') {
        zones.sort((a, b) => (popularityData[b.id] || 0) - (popularityData[a.id] || 0));
    }
    zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));
    displayZones(zones);
}

function displayZones(zones) {
    container.innerHTML = "";
    zones.forEach(file => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";
        zoneItem.onclick = () => openZone(file);
        
        const img = document.createElement("img");
        img.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        zoneItem.appendChild(img);
        
        const button = document.createElement("button");
        button.textContent = file.name;
        button.onclick = (e) => {
            e.stopPropagation();
            openZone(file);
        };
        zoneItem.appendChild(button);
        
        container.appendChild(zoneItem);
    });
    
    if (container.innerHTML === "") {
        container.innerHTML = "No zones found.";
    } else {
        document.getElementById("zoneCount").textContent = `Zones Loaded: ${zones.length}`;
    }
}

function filterZones() {
    const query = searchBar.value.toLowerCase();
    const filtered = zones.filter(zone => zone.name.toLowerCase().includes(query));
    displayZones(filtered);
}

function openZone(file) {
    if (file.url.startsWith("http")) {
        window.open(file.url, "_blank");
        return;
    }
    
    const url = file.url
        .replace("{COVER_URL}", coverURL)
        .replace("{HTML_URL}", htmlURL)
        .replace("{NEWHTML_URL}", NewhtmlURL);
    
    fetch(url + "?t=" + Date.now())
        .then(response => response.text())
        .then(html => {
            if (!zoneFrame.contentDocument) {
                zoneFrame = document.createElement("iframe");
                zoneFrame.id = "zoneFrame";
                zoneViewer.appendChild(zoneFrame);
            }
            
            zoneFrame.contentDocument.open();
            zoneFrame.contentDocument.write(html);
            zoneFrame.contentDocument.close();
            
            document.getElementById('zoneName').textContent = file.name;
            document.getElementById('zoneId').textContent = file.id;
            document.getElementById('zoneAuthor').textContent = "by " + file.author;
            if (file.authorLink) {
                document.getElementById('zoneAuthor').href = file.authorLink;
            }
            
            zoneViewer.style.display = "block";
            
            const url = new URL(window.location);
            url.searchParams.set('id', file.id);
            history.pushState(null, '', url.toString());
        })
        .catch(error => alert("Failed to load zone: " + error));
}

function fullscreenZone() {
    if (zoneFrame.requestFullscreen) {
        zoneFrame.requestFullscreen();
    } else if (zoneFrame.mozRequestFullScreen) {
        zoneFrame.mozRequestFullScreen();
    } else if (zoneFrame.webkitRequestFullscreen) {
        zoneFrame.webkitRequestFullscreen();
    } else if (zoneFrame.msRequestFullscreen) {
        zoneFrame.msRequestFullscreen();
    }
}

function closeZone() {
    zoneViewer.style.display = 'none';
    zoneFrame.srcdoc = '';
    const url = new URL(window.location);
    url.searchParams.delete('id');
    history.pushState(null, '', url.toString());
}

function saveData() {
    let data = JSON.stringify(localStorage) + '\n\n|\n\n' + document.cookie;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
    link.download = Date.now() + '.data';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        const [lsData, cookieData] = content.split('\n\n|\n\n');
        try {
            const parsed = JSON.parse(lsData);
            for (let key in parsed) localStorage.setItem(key, parsed[key]);
        } catch (err) {
            console.error(err);
        }
        if (cookieData) {
            cookieData.split('; ').forEach(c => document.cookie = c);
        }
        alert('Data loaded');
    };
    reader.readAsText(file);
}

document.getElementById('settings').addEventListener('click', () => {
    document.getElementById('popupTitle').textContent = 'Settings';
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <button id="settings-button" onclick="toggleDarkMode()">Toggle Dark Mode</button>
        <button id="settings-button" onclick="showContact()">Contact</button>
        <button id="settings-button" onclick="loadPrivacy()">Privacy Policy</button>
        <button id="settings-button" onclick="saveData()">Export Data</button>
        <label for="importData" style="display:block; width:100%; padding:0.75rem; background:var(--primary-color); color:white; border:none; border-radius:4px; cursor:pointer; font-size:16px; text-align:center; margin-bottom:1rem;">Import Data</label>
        <input type="file" id="importData" style="display:none;" onchange="loadData(event)">
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = 'flex';
});

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function showContact() {
    document.getElementById('popupTitle').textContent = 'Contact';
    document.getElementById('popupBody').innerHTML = '<p>Contact info or form here.</p>';
    document.getElementById('popupBody').contentEditable = true;
    document.getElementById('popupOverlay').style.display = 'flex';
}

function loadPrivacy() {
    document.getElementById('popupTitle').textContent = "Privacy Policy";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <div style="max-height:60vh; overflow-y:auto;">
            <h2>PRIVACY POLICY</h2>
            <p>Last updated February 12, 2026</p>
            <p>This Privacy Notice for Games ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you visit our website at https://h0lysalmon.vercel.app or engage with us in other related ways.</p>
            <p>Questions or concerns? Contact us at https://discord.gg/NAFw4ykZ7n.</p>
            <!-- rest of your privacy content here – truncated for brevity -->
        </div>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

function closePopup() {
    document.getElementById('popupOverlay').style.display = "none";
}

// Anti-blocking / canvas override (unchanged)
const schoolList = ["deledao", "goguardian", "lightspeed", "linewize", "securly", ".edu/"];
function isBlockedDomain(url) {
    const domain = new URL(url, location.origin).hostname + "/";
    return schoolList.some(school => domain.includes(school));
}
const originalFetch = window.fetch;
window.fetch = function (url, options) {
    if (isBlockedDomain(url)) {
        console.warn(`lam`);
        return Promise.reject(new Error("lam"));
    }
    return originalFetch.apply(this, arguments);
};
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url) {
    if (isBlockedDomain(url)) {
        console.warn(`lam`);
        return;
    }
    return originalOpen.apply(this, arguments);
};
HTMLCanvasElement.prototype.toDataURL = function (...args) {
    return "";
};

// Start loading
listZones();
