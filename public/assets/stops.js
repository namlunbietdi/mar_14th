const currentStopUser = window.busApp?.getStoredUser();
const stopTableBody = document.getElementById("stopTableBody");
const stopPageMessage = document.getElementById("stopPageMessage");
const openStopModalBtn = document.getElementById("openStopModalBtn");
const exportStopsBtn = document.getElementById("exportStopsBtn");
const stopModal = document.getElementById("stopModal");
const closeStopModalBtn = document.getElementById("closeStopModalBtn");
const cancelStopModalBtn = document.getElementById("cancelStopModalBtn");
const stopForm = document.getElementById("stopForm");
const editingStopId = document.getElementById("editingStopId");
const stopModalTitle = document.getElementById("stopModalTitle");
const stopCodeInput = document.getElementById("stopCodeInput");
const stopNameInput = document.getElementById("stopNameInput");
const stopLongitudeInput = document.getElementById("stopLongitudeInput");
const stopLatitudeInput = document.getElementById("stopLatitudeInput");
const stopIsEndpointSelect = document.getElementById("stopIsEndpointSelect");
const stopRouteCheckboxList = document.getElementById("stopRouteCheckboxList");
const stopFormMessage = document.getElementById("stopFormMessage");
const selectedStopTitle = document.getElementById("selectedStopTitle");
const selectedStopText = document.getElementById("selectedStopText");

let stops = [];
let routes = [];
let selectedStopId = "";
let stopMarkers = [];

if (currentStopUser?.role !== "admin") {
  openStopModalBtn.style.display = "none";
}

const stopMap = L.map("stopMap").setView([21.0285, 105.8542], 12);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
}).addTo(stopMap);

let stopMarkerIcon = null;

const busStopImage = new Image();
busStopImage.onload = () => {
  stopMarkerIcon = L.icon({
    iconUrl: "../assets/images/bus_stop.png",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -24]
  });
  renderStopMap();
};
busStopImage.src = "../assets/images/bus_stop.png";

function setStopPageMessage(message, type = "") {
  stopPageMessage.textContent = message;
  stopPageMessage.className = `inline-message ${type}`.trim();
}

function setStopFormMessage(message, type = "") {
  stopFormMessage.textContent = message;
  stopFormMessage.className = `inline-message ${type}`.trim();
}

function closeStopModal() {
  stopModal.classList.add("hidden");
}

async function loadNextStopCode() {
  try {
    const response = await window.busApp.authFetch("/api/stops/next-code");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the tai ma diem dung.");
    stopCodeInput.value = data.stopCode;
  } catch (error) {
    stopCodeInput.value = "";
    setStopFormMessage(error.message, "error");
  }
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

async function exportStops() {
  try {
    const response = await window.busApp.authFetch("/api/stops/export", { headers: {} });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Khong the export danh sach diem dung.");
    }
    const csvBlob = await response.blob();
    downloadBlob(csvBlob, "danh-sach-diem-dung.csv", "text/csv;charset=utf-8;");
  } catch (error) {
    setStopPageMessage(error.message, "error");
  }
}

function renderRouteCheckboxes(selectedRouteIds = []) {
  if (!routes.length) {
    stopRouteCheckboxList.innerHTML = `<p class="muted-text">Chua co tuyen nao de gan vao diem dung.</p>`;
    return;
  }

  stopRouteCheckboxList.innerHTML = routes
    .map((route) => `
      <div class="route-direction-item">
        <div class="route-direction-title">${route.routeNumber} - ${route.routeName}</div>
        <label class="route-checkbox-item">
          <input type="checkbox" data-route-id="${route.id}" data-direction="outbound" ${selectedRouteIds.some((item) => item.routeId === route.id && item.outbound) ? "checked" : ""}>
          <span>Luot di</span>
        </label>
        <label class="route-checkbox-item">
          <input type="checkbox" data-route-id="${route.id}" data-direction="inbound" ${selectedRouteIds.some((item) => item.routeId === route.id && item.inbound) ? "checked" : ""}>
          <span>Luot ve</span>
        </label>
      </div>
    `)
    .join("");
}

function getCheckedRouteDirections() {
  const groupedRoutes = new Map();

  [...stopRouteCheckboxList.querySelectorAll('input[type="checkbox"]')].forEach((checkbox) => {
    const routeId = checkbox.dataset.routeId;
    const direction = checkbox.dataset.direction;

    if (!groupedRoutes.has(routeId)) {
      groupedRoutes.set(routeId, {
        routeId,
        outbound: false,
        inbound: false
      });
    }

    if (checkbox.checked) {
      groupedRoutes.get(routeId)[direction] = true;
    }
  });

  return [...groupedRoutes.values()].filter((item) => item.outbound || item.inbound);
}

function clearStopMarkers() {
  stopMarkers.forEach((marker) => stopMap.removeLayer(marker));
  stopMarkers = [];
}

function renderStopMap() {
  clearStopMarkers();

  if (!stops.length) {
    selectedStopTitle.textContent = "Tat ca diem dung";
    selectedStopText.textContent = "Ban do mac dinh se hien thi toan bo diem dung trong he thong.";
    return;
  }

  const selectedStop = stops.find((stop) => stop.id === selectedStopId);
  const visibleStops = selectedStop ? [selectedStop] : stops;
  const bounds = [];

  visibleStops.forEach((stop) => {
    const markerOptions = stopMarkerIcon ? { icon: stopMarkerIcon } : undefined;
    const marker = L.marker([stop.latitude, stop.longitude], markerOptions).addTo(stopMap);
    marker.bindPopup(`<strong>${stop.stopCode}</strong><br>${stop.stopName}`);
    stopMarkers.push(marker);
    bounds.push([stop.latitude, stop.longitude]);
  });

  if (selectedStop) {
    selectedStopTitle.textContent = `${selectedStop.stopCode} - ${selectedStop.stopName}`;
    selectedStopText.textContent = `Kinh do: ${selectedStop.longitude} | Vi do: ${selectedStop.latitude}`;
    stopMap.setView([selectedStop.latitude, selectedStop.longitude], 16);
    stopMarkers[0]?.openPopup();
  } else {
    selectedStopTitle.textContent = "Tat ca diem dung";
    selectedStopText.textContent = "Ban do mac dinh se hien thi toan bo diem dung trong he thong.";
    stopMap.fitBounds(bounds, { padding: [24, 24] });
  }
}

function renderStops() {
  if (!stops.length) {
    stopTableBody.innerHTML = `<tr><td colspan="5">Chua co diem dung nao.</td></tr>`;
    renderStopMap();
    return;
  }

  const canManage = currentStopUser?.role === "admin";
  stopTableBody.innerHTML = stops
    .map((stop) => `
      <tr class="${stop.id === selectedStopId ? "selected-row" : ""}" data-stop-id="${stop.id}">
        <td>${stop.stopCode}</td>
        <td>${stop.stopName}</td>
        <td>${stop.routeNumbers.join(", ") || "-"}</td>
        <td>${stop.isEndpoint ? "Co" : "Khong"}</td>
        <td>${canManage ? `<div class="action-group"><button class="link-btn" type="button" data-action="edit-stop" data-id="${stop.id}">Sua</button><button class="link-btn danger" type="button" data-action="delete-stop" data-id="${stop.id}">Xoa</button></div>` : '<span class="muted-text">Khong co quyen</span>'}</td>
      </tr>
    `)
    .join("");

  renderStopMap();
}

async function loadStops() {
  setStopPageMessage("Dang tai danh sach diem dung...");

  try {
    const [stopsResponse, routesResponse] = await Promise.all([
      window.busApp.authFetch("/api/stops"),
      window.busApp.authFetch("/api/routes")
    ]);
    const stopsData = await stopsResponse.json();
    const routesData = await routesResponse.json();

    if (!stopsResponse.ok) throw new Error(stopsData.message || "Khong the tai danh sach diem dung.");
    if (!routesResponse.ok) throw new Error(routesData.message || "Khong the tai danh sach tuyen.");

    stops = stopsData.stops;
    routes = routesData.routes;

    renderStops();
    setStopPageMessage(`Da tai ${stops.length} diem dung.`, "success");
  } catch (error) {
    stopTableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
    setStopPageMessage(error.message, "error");
  }
}

async function openStopModal(mode, stop = null) {
  if (currentStopUser?.role !== "admin") return;
  stopForm.reset();
  setStopFormMessage("");
  editingStopId.value = stop?.id || "";
  stopModalTitle.textContent = mode === "edit" ? "Chinh sua diem dung" : "Them diem dung";

  if (mode === "edit" && stop) {
    stopCodeInput.value = stop.stopCode;
    stopNameInput.value = stop.stopName;
    stopLongitudeInput.value = stop.longitude;
    stopLatitudeInput.value = stop.latitude;
    stopIsEndpointSelect.value = String(stop.isEndpoint);
    renderRouteCheckboxes(stop.servedRoutes || []);
  } else {
    await loadNextStopCode();
    renderRouteCheckboxes();
  }

  stopModal.classList.remove("hidden");
}

openStopModalBtn?.addEventListener("click", () => openStopModal("create"));
exportStopsBtn?.addEventListener("click", exportStops);
closeStopModalBtn?.addEventListener("click", closeStopModal);
cancelStopModalBtn?.addEventListener("click", closeStopModal);
stopModal?.addEventListener("click", (event) => {
  if (event.target === stopModal) closeStopModal();
});

stopTableBody?.addEventListener("click", async (event) => {
  const row = event.target.closest("tr[data-stop-id]");
  if (row) {
    selectedStopId = row.dataset.stopId;
    renderStops();
  }

  const action = event.target.dataset.action;
  const stopId = event.target.dataset.id;
  if (!action || !stopId) return;

  const selectedStop = stops.find((stop) => stop.id === stopId);

  if (action === "edit-stop" && selectedStop) {
    openStopModal("edit", selectedStop);
  }

  if (action === "delete-stop") {
    if (!window.confirm("Ban co chac chan muon xoa diem dung nay khong?")) return;
    try {
      const response = await window.busApp.authFetch(`/api/stops/${stopId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Khong the xoa diem dung.");
      if (selectedStopId === stopId) selectedStopId = "";
      setStopPageMessage(data.message, "success");
      await loadStops();
    } catch (error) {
      setStopPageMessage(error.message, "error");
    }
  }
});

stopForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      stopName: stopNameInput.value.trim(),
      longitude: Number(stopLongitudeInput.value),
      latitude: Number(stopLatitudeInput.value),
      servedRoutes: getCheckedRouteDirections(),
      isEndpoint: stopIsEndpointSelect.value === "true"
    };

    const isEditing = Boolean(editingStopId.value);
    const response = await window.busApp.authFetch(isEditing ? `/api/stops/${editingStopId.value}` : "/api/stops", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the luu diem dung.");

    selectedStopId = data.stop.id;
    setStopPageMessage(data.message, "success");
    closeStopModal();
    await loadStops();
  } catch (error) {
    setStopFormMessage(error.message, "error");
  }
});

loadStops();
