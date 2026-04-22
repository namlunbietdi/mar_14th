const currentRouteUser = window.busApp?.getStoredUser();
const routeTableBody = document.getElementById("routeTableBody");
const routePageMessage = document.getElementById("routePageMessage");
const openRouteModalBtn = document.getElementById("openRouteModalBtn");
const routeModal = document.getElementById("routeModal");
const closeRouteModalBtn = document.getElementById("closeRouteModalBtn");
const cancelRouteModalBtn = document.getElementById("cancelRouteModalBtn");
const routeForm = document.getElementById("routeForm");
const editingRouteId = document.getElementById("editingRouteId");
const routeModalTitle = document.getElementById("routeModalTitle");
const routeFormMessage = document.getElementById("routeFormMessage");
const routeNumberInput = document.getElementById("routeNumberInput");
const routeNameInput = document.getElementById("routeNameInput");
const routeStartPointInput = document.getElementById("routeStartPointInput");
const routeEndPointInput = document.getElementById("routeEndPointInput");
const routeOperatingCountInput = document.getElementById("routeOperatingCountInput");
const routeReserveCountInput = document.getElementById("routeReserveCountInput");
const routeOutboundFileInput = document.getElementById("routeOutboundFileInput");
const routeInboundFileInput = document.getElementById("routeInboundFileInput");
const selectedRouteTitle = document.getElementById("selectedRouteTitle");
const selectedRouteText = document.getElementById("selectedRouteText");
const showBothDirectionsBtn = document.getElementById("showBothDirectionsBtn");
const showOutboundBtn = document.getElementById("showOutboundBtn");
const showInboundBtn = document.getElementById("showInboundBtn");
const editorOutboundBtn = document.getElementById("editorOutboundBtn");
const editorInboundBtn = document.getElementById("editorInboundBtn");
const directionEditorMessage = document.getElementById("directionEditorMessage");
const directionStopSelect = document.getElementById("directionStopSelect");
const addDirectionStopBtn = document.getElementById("addDirectionStopBtn");
const saveDirectionBtn = document.getElementById("saveDirectionBtn");
const directionOrderBody = document.getElementById("directionOrderBody");
const previewRuntimeBtn = document.getElementById("previewRuntimeBtn");
const downloadRuntimeBtn = document.getElementById("downloadRuntimeBtn");
const runtimePreview = document.getElementById("runtimePreview");

let routes = [];
let selectedRouteId = "";
let displayDirection = "both";
let outboundLayer = null;
let inboundLayer = null;
let endpointStops = [];
let allStops = [];
let routeStopMarkers = [];
let editorDirection = "outbound";
let routeDirectionState = { outbound: [], inbound: [] };
let draggedDirectionIndex = null;

const canManageRoutes = currentRouteUser?.role === "admin";

if (!canManageRoutes) {
  openRouteModalBtn.style.display = "none";
  addDirectionStopBtn.disabled = true;
  saveDirectionBtn.disabled = true;
}

const routeMap = L.map("routeMap").setView([21.0285, 105.8542], 12);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
}).addTo(routeMap);

let routeStopIcon = null;

const routeStopImage = new Image();
routeStopImage.onload = () => {
  routeStopIcon = L.icon({
    iconUrl: "../assets/images/bus_stop.png",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -20]
  });
  renderRouteMap(routes.find((route) => route.id === selectedRouteId) || null);
};
routeStopImage.src = "../assets/images/bus_stop.png";

function setRoutePageMessage(message, type = "") {
  routePageMessage.textContent = message;
  routePageMessage.className = `inline-message ${type}`.trim();
}

function setRouteFormMessage(message, type = "") {
  routeFormMessage.textContent = message;
  routeFormMessage.className = `inline-message ${type}`.trim();
}

function setDirectionEditorMessage(message, type = "") {
  directionEditorMessage.textContent = message;
  directionEditorMessage.className = `inline-message ${type}`.trim();
}

function updateDirectionButtons() {
  showBothDirectionsBtn.classList.toggle("active", displayDirection === "both");
  showOutboundBtn.classList.toggle("active", displayDirection === "outbound");
  showInboundBtn.classList.toggle("active", displayDirection === "inbound");
}

function updateEditorDirectionButtons() {
  editorOutboundBtn.classList.toggle("active", editorDirection === "outbound");
  editorInboundBtn.classList.toggle("active", editorDirection === "inbound");
}

function closeRouteModal() {
  routeModal.classList.add("hidden");
}

function renderEndpointOptions(selectedStartPoint = "", selectedEndPoint = "") {
  const options = endpointStops
    .map((stop) => `<option value="${stop.stopName}">${stop.stopCode} - ${stop.stopName}</option>`)
    .join("");

  routeStartPointInput.innerHTML = options;
  routeEndPointInput.innerHTML = options;

  if (selectedStartPoint) {
    routeStartPointInput.value = selectedStartPoint;
  }

  if (selectedEndPoint) {
    routeEndPointInput.value = selectedEndPoint;
  }
}

function openRouteModal(mode, route = null) {
  if (!canManageRoutes) return;
  routeForm.reset();
  setRouteFormMessage("");
  editingRouteId.value = route?.id || "";
  routeModalTitle.textContent = mode === "edit" ? "Chinh sua tuyen" : "Them tuyen";
  renderEndpointOptions(route?.startPoint || "", route?.endPoint || "");

  if (mode === "edit" && route) {
    routeNumberInput.value = route.routeNumber;
    routeNameInput.value = route.routeName;
    routeOperatingCountInput.value = route.operatingVehicleCount;
    routeReserveCountInput.value = route.reserveVehicleCount;
  }

  routeOutboundFileInput.value = "";
  routeInboundFileInput.value = "";

  routeModal.classList.remove("hidden");
}

function clearRouteLayers() {
  if (outboundLayer) routeMap.removeLayer(outboundLayer);
  if (inboundLayer) routeMap.removeLayer(inboundLayer);
  routeStopMarkers.forEach((marker) => routeMap.removeLayer(marker));
  outboundLayer = null;
  inboundLayer = null;
  routeStopMarkers = [];
}

function getVisibleStopsForRoute(routeId) {
  return allStops.filter((stop) =>
    stop.servedRoutes?.some((servedRoute) => {
      if (servedRoute.routeId !== routeId) return false;
      if (displayDirection === "outbound") return servedRoute.outbound;
      if (displayDirection === "inbound") return servedRoute.inbound;
      return servedRoute.outbound || servedRoute.inbound;
    })
  );
}

function renderRouteStops(route) {
  if (!route) {
    return [];
  }

  const visibleStops = getVisibleStopsForRoute(route.id);
  return visibleStops.map((stop) => {
    const markerOptions = routeStopIcon ? { icon: routeStopIcon } : undefined;
    const marker = L.marker([stop.latitude, stop.longitude], markerOptions).addTo(routeMap);
    const stopDirection = stop.servedRoutes.find((servedRoute) => servedRoute.routeId === route.id);
    const directionLabels = [];

    if (stopDirection?.outbound) directionLabels.push("Luot di");
    if (stopDirection?.inbound) directionLabels.push("Luot ve");

    marker.bindPopup(
      `<strong>${stop.stopCode}</strong><br>${stop.stopName}<br><span>${directionLabels.join(" / ") || "Tuyen da chon"}</span>`
    );

    return marker;
  });
}

function renderRouteMap(route) {
  clearRouteLayers();

  if (!route) {
    selectedRouteTitle.textContent = "Chua chon tuyen";
    selectedRouteText.textContent = "Hay chon mot dong o bang ben trai de xem lo trinh tren ban do.";
    return;
  }

  selectedRouteTitle.textContent = `${route.routeNumber} - ${route.routeName}`;
  const selectedStops = getVisibleStopsForRoute(route.id);
  selectedRouteText.textContent = `${route.startPoint} -> ${route.endPoint} | ${selectedStops.length} diem dung`;

  const layers = [];

  if ((displayDirection === "both" || displayDirection === "outbound") && route.outboundGeoJson) {
    outboundLayer = L.geoJSON(route.outboundGeoJson, { style: { color: "#1565c0", weight: 5 } }).addTo(routeMap);
    layers.push(outboundLayer);
  }

  if ((displayDirection === "both" || displayDirection === "inbound") && route.inboundGeoJson) {
    inboundLayer = L.geoJSON(route.inboundGeoJson, { style: { color: "#d62828", weight: 5 } }).addTo(routeMap);
    layers.push(inboundLayer);
  }

  routeStopMarkers = renderRouteStops(route);
  routeStopMarkers.forEach((marker) => {
    layers.push(marker);
  });

  if (layers.length) {
    let bounds = layers[0].getBounds ? layers[0].getBounds() : L.latLngBounds([layers[0].getLatLng()]);
    layers.slice(1).forEach((layer) => {
      if (layer.getBounds) {
        bounds = bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds = bounds.extend(layer.getLatLng());
      }
    });
    routeMap.fitBounds(bounds, { padding: [20, 20] });
  }
}

function renderRoutes() {
  if (!routes.length) {
    routeTableBody.innerHTML = `<tr><td colspan="8">Chua co tuyen nao.</td></tr>`;
    renderRouteMap(null);
    return;
  }

  routeTableBody.innerHTML = routes
    .map((route) => `
      <tr class="${route.id === selectedRouteId ? "selected-row" : ""}" data-route-id="${route.id}">
        <td>${route.routeNumber}</td>
        <td>${route.routeName}</td>
        <td>${route.startPoint}</td>
        <td>${route.endPoint}</td>
        <td>${route.operatingVehicleCount}</td>
        <td>${route.reserveVehicleCount}</td>
        <td>${route.totalVehicleCount}</td>
        <td>${canManageRoutes ? `<div class="action-group"><button class="link-btn" type="button" data-action="edit-route" data-id="${route.id}">Sua</button><button class="link-btn danger" type="button" data-action="delete-route" data-id="${route.id}">Xoa</button></div>` : '<span class="muted-text">Khong co quyen</span>'}</td>
      </tr>
    `)
    .join("");

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;
  renderRouteMap(selectedRoute);
}

function renderDirectionStopSelect() {
  const options = allStops
    .map((stop) => `<option value="${stop.id}">${stop.stopCode} - ${stop.stopName}</option>`)
    .join("");
  directionStopSelect.innerHTML = options || '<option value="">Khong co diem dung</option>';
}

function getCurrentDirectionStops() {
  return routeDirectionState[editorDirection] || [];
}

function clearDirectionDropIndicators() {
  directionOrderBody.querySelectorAll(".direction-drop-target").forEach((row) => {
    row.classList.remove("direction-drop-target");
  });
}

function moveDirectionStop(fromIndex, toIndex) {
  const stops = getCurrentDirectionStops();
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= stops.length || toIndex >= stops.length) return;
  if (fromIndex === toIndex) return;

  const [movingStop] = stops.splice(fromIndex, 1);
  stops.splice(toIndex, 0, movingStop);
  renderDirectionTable();
}

function renderDirectionTable() {
  if (!selectedRouteId) {
    directionOrderBody.innerHTML = `<tr><td colspan="7">Chon mot tuyen de quan ly thu tu diem dung.</td></tr>`;
    return;
  }

  const stops = getCurrentDirectionStops();
  if (!stops.length) {
    directionOrderBody.innerHTML = `<tr><td colspan="7">Chua co diem dung nao trong huong nay.</td></tr>`;
    return;
  }

  directionOrderBody.innerHTML = stops
    .map((stop, index) => `
      <tr data-index="${index}" class="${canManageRoutes ? "direction-draggable-row" : ""}">
        <td>${index + 1}</td>
        <td>${stop.stopCode || "-"}</td>
        <td>${stop.stopName || "-"}</td>
        <td><input class="direction-audio-input" data-index="${index}" type="text" value="${stop.audioId || ""}" ${canManageRoutes ? "" : "disabled"}></td>
        <td><input class="direction-terminal-checkbox" data-index="${index}" type="checkbox" ${stop.isTerminal ? "checked" : ""} ${canManageRoutes ? "" : "disabled"}></td>
        <td>${canManageRoutes ? `<span class="direction-drag-handle" draggable="true" data-index="${index}" title="Keo de doi thu tu">↕ Keo</span>` : '<span class="muted-text">Khong co quyen</span>'}</td>
        <td><button class="link-btn danger" type="button" data-action="remove-stop" data-index="${index}" ${canManageRoutes ? "" : "disabled"}>Xoa</button></td>
      </tr>
    `)
    .join("");
}

async function loadRouteDirection(direction) {
  if (!selectedRouteId) return;
  const response = await window.busApp.authFetch(`/api/route-directions/${selectedRouteId}/${direction}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Khong the tai thu tu diem dung.");
  }

  routeDirectionState[direction] = (data.direction.stops || []).map((item, index) => ({
    stopId: item.stopId,
    stopCode: item.stopCode,
    stopName: item.stopName,
    audioId: item.audioId || item.stopCode || "",
    isTerminal: Boolean(item.isTerminal),
    order: Number(item.order || index + 1)
  }));
}

async function loadDirectionEditor() {
  if (!selectedRouteId) {
    routeDirectionState = { outbound: [], inbound: [] };
    renderDirectionTable();
    return;
  }

  setDirectionEditorMessage("Dang tai cau hinh diem dung...");
  try {
    await Promise.all([loadRouteDirection("outbound"), loadRouteDirection("inbound")]);
    setDirectionEditorMessage("Da tai cau hinh diem dung.", "success");
    renderDirectionTable();
  } catch (error) {
    setDirectionEditorMessage(error.message, "error");
    renderDirectionTable();
  }
}

async function saveDirectionStops() {
  if (!canManageRoutes) return;
  if (!selectedRouteId) {
    setDirectionEditorMessage("Vui long chon tuyen truoc khi luu.", "error");
    return;
  }

  const payloadStops = getCurrentDirectionStops().map((item, index) => ({
    stopId: item.stopId,
    order: index + 1,
    isTerminal: Boolean(item.isTerminal),
    audioId: String(item.audioId || "").trim()
  }));

  try {
    const response = await window.busApp.authFetch(`/api/route-directions/${selectedRouteId}/${editorDirection}`, {
      method: "PUT",
      body: JSON.stringify({ stops: payloadStops })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the luu thu tu diem dung.");
    routeDirectionState[editorDirection] = (data.direction.stops || []).map((item, index) => ({
      stopId: item.stopId,
      stopCode: item.stopCode,
      stopName: item.stopName,
      audioId: item.audioId || item.stopCode || "",
      isTerminal: Boolean(item.isTerminal),
      order: Number(item.order || index + 1)
    }));
    renderDirectionTable();
    setDirectionEditorMessage(data.message, "success");
  } catch (error) {
    setDirectionEditorMessage(error.message, "error");
  }
}

function addStopToDirection() {
  if (!canManageRoutes) return;
  if (!selectedRouteId) {
    setDirectionEditorMessage("Vui long chon tuyen truoc.", "error");
    return;
  }

  const stopId = directionStopSelect.value;
  if (!stopId) return;
  const stop = allStops.find((item) => item.id === stopId);
  if (!stop) return;

  const stops = getCurrentDirectionStops();
  if (stops.some((item) => item.stopId === stopId)) {
    setDirectionEditorMessage("Diem dung da ton tai trong huong nay.", "error");
    return;
  }

  stops.push({
    stopId: stop.id,
    stopCode: stop.stopCode,
    stopName: stop.stopName,
    audioId: stop.stopCode || "",
    isTerminal: false,
    order: stops.length + 1
  });
  renderDirectionTable();
  setDirectionEditorMessage("Da them diem dung vao danh sach.", "success");
}

async function previewRuntimeConfig(download = false) {
  if (!selectedRouteId) {
    setDirectionEditorMessage("Vui long chon mot tuyen.", "error");
    return;
  }

  try {
    const response = await window.busApp.authFetch(`/api/routes/${selectedRouteId}/runtime-config`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the tai runtime config.");
    const jsonContent = JSON.stringify(data.config, null, 2);

    if (download) {
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const route = routes.find((item) => item.id === selectedRouteId);
      const routeTag = route?.routeNumber || "route";
      const anchor = document.createElement("a");
      anchor.href = window.URL.createObjectURL(blob);
      anchor.download = `runtime-config-${routeTag}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDirectionEditorMessage("Da tai runtime config.", "success");
      return;
    }

    runtimePreview.textContent = jsonContent;
    runtimePreview.classList.remove("hidden");
    setDirectionEditorMessage("Da tai runtime config.", "success");
  } catch (error) {
    setDirectionEditorMessage(error.message, "error");
  }
}

async function loadRoutes() {
  setRoutePageMessage("Dang tai danh sach tuyen...");
  try {
    const [routesResponse, stopsResponse] = await Promise.all([
      window.busApp.authFetch("/api/routes"),
      window.busApp.authFetch("/api/stops")
    ]);
    const routesData = await routesResponse.json();
    const stopsData = await stopsResponse.json();
    if (!routesResponse.ok) throw new Error(routesData.message || "Khong the tai danh sach tuyen.");
    if (!stopsResponse.ok) throw new Error(stopsData.message || "Khong the tai danh sach diem dung.");

    routes = routesData.routes;
    allStops = stopsData.stops;
    endpointStops = allStops.filter((stop) => stop.isEndpoint);
    renderDirectionStopSelect();
    renderRoutes();
    setRoutePageMessage(`Da tai ${routes.length} tuyen.`, "success");

    if (selectedRouteId) {
      await loadDirectionEditor();
    } else {
      renderDirectionTable();
    }
  } catch (error) {
    routeTableBody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
    setRoutePageMessage(error.message, "error");
  }
}

routeTableBody?.addEventListener("click", async (event) => {
  const row = event.target.closest("tr[data-route-id]");
  if (row) {
    selectedRouteId = row.dataset.routeId;
    runtimePreview.classList.add("hidden");
    renderRoutes();
    await loadDirectionEditor();
  }

  const action = event.target.dataset.action;
  const routeId = event.target.dataset.id;
  const route = routes.find((item) => item.id === routeId);
  if (!action || !routeId) return;

  if (action === "edit-route" && route) {
    openRouteModal("edit", route);
  }

  if (action === "delete-route") {
    if (!window.confirm("Ban co chac chan muon xoa tuyen nay khong?")) return;
    try {
      const response = await window.busApp.authFetch(`/api/routes/${routeId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Khong the xoa tuyen.");
      if (selectedRouteId === routeId) {
        selectedRouteId = "";
        routeDirectionState = { outbound: [], inbound: [] };
      }
      setRoutePageMessage(data.message, "success");
      await loadRoutes();
    } catch (error) {
      setRoutePageMessage(error.message, "error");
    }
  }
});

directionOrderBody?.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const index = Number(event.target.dataset.index);
  if (!action || !Number.isFinite(index) || !canManageRoutes) return;
  const stops = getCurrentDirectionStops();

  if (action === "remove-stop") {
    stops.splice(index, 1);
  }

  renderDirectionTable();
});

directionOrderBody?.addEventListener("dragstart", (event) => {
  if (!canManageRoutes) return;
  const handle = event.target.closest(".direction-drag-handle");
  if (!handle) return;

  draggedDirectionIndex = Number(handle.dataset.index);
  if (!Number.isFinite(draggedDirectionIndex)) return;

  const row = handle.closest("tr[data-index]");
  row?.classList.add("direction-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(draggedDirectionIndex));
});

directionOrderBody?.addEventListener("dragover", (event) => {
  if (!canManageRoutes || draggedDirectionIndex === null) return;
  const row = event.target.closest("tr[data-index]");
  if (!row) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearDirectionDropIndicators();
  row.classList.add("direction-drop-target");
});

directionOrderBody?.addEventListener("drop", (event) => {
  if (!canManageRoutes) return;
  const row = event.target.closest("tr[data-index]");
  if (!row || draggedDirectionIndex === null) return;

  event.preventDefault();
  const dropIndex = Number(row.dataset.index);
  if (!Number.isFinite(dropIndex)) return;
  moveDirectionStop(draggedDirectionIndex, dropIndex);
  setDirectionEditorMessage("Da cap nhat thu tu bang keo tha. Nhan 'Luu thu tu' de luu len he thong.", "success");
  draggedDirectionIndex = null;
  clearDirectionDropIndicators();
});

directionOrderBody?.addEventListener("dragend", () => {
  draggedDirectionIndex = null;
  clearDirectionDropIndicators();
  directionOrderBody.querySelectorAll(".direction-dragging").forEach((row) => {
    row.classList.remove("direction-dragging");
  });
});

directionOrderBody?.addEventListener("input", (event) => {
  if (!canManageRoutes) return;
  const index = Number(event.target.dataset.index);
  if (!Number.isFinite(index)) return;
  const stops = getCurrentDirectionStops();
  const item = stops[index];
  if (!item) return;

  if (event.target.classList.contains("direction-audio-input")) {
    item.audioId = event.target.value;
  }
});

directionOrderBody?.addEventListener("change", (event) => {
  if (!canManageRoutes) return;
  const index = Number(event.target.dataset.index);
  if (!Number.isFinite(index)) return;
  const stops = getCurrentDirectionStops();
  const item = stops[index];
  if (!item) return;

  if (event.target.classList.contains("direction-terminal-checkbox")) {
    item.isTerminal = event.target.checked;
  }
});

openRouteModalBtn?.addEventListener("click", () => openRouteModal("create"));
closeRouteModalBtn?.addEventListener("click", closeRouteModal);
cancelRouteModalBtn?.addEventListener("click", closeRouteModal);
routeModal?.addEventListener("click", (event) => {
  if (event.target === routeModal) closeRouteModal();
});

routeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      routeNumber: routeNumberInput.value.trim(),
      routeName: routeNameInput.value.trim(),
      startPoint: routeStartPointInput.value.trim(),
      endPoint: routeEndPointInput.value.trim(),
      operatingVehicleCount: routeOperatingCountInput.value,
      reserveVehicleCount: routeReserveCountInput.value
    };
    const isEditing = Boolean(editingRouteId.value);
    const response = await window.busApp.authFetch(isEditing ? `/api/routes/${editingRouteId.value}` : "/api/routes", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the luu tuyen.");
    const savedRouteId = data.route.id;
    selectedRouteId = savedRouteId;

    if (routeOutboundFileInput.files?.[0]) {
      await uploadGeoJson(savedRouteId, "outbound", routeOutboundFileInput.files[0]);
    }

    if (routeInboundFileInput.files?.[0]) {
      await uploadGeoJson(savedRouteId, "inbound", routeInboundFileInput.files[0]);
    }

    setRoutePageMessage(data.message, "success");
    closeRouteModal();
    await loadRoutes();
  } catch (error) {
    setRouteFormMessage(error.message, "error");
  }
});

async function uploadGeoJson(routeId, direction, file) {
  if (!routeId) {
    setRoutePageMessage("Hay chon mot tuyen truoc khi them mo phong lo trinh.", "error");
    return;
  }

  try {
    const content = await file.text();
    const geoJson = JSON.parse(content);
    const response = await window.busApp.authFetch(`/api/routes/${routeId}/geojson/${direction}`, {
      method: "POST",
      body: JSON.stringify({ geoJson })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the cap nhat GEOJSON.");
    setRoutePageMessage(data.message, "success");
    await loadRoutes();
  } catch (error) {
    setRoutePageMessage(error.message, "error");
  }
}

showBothDirectionsBtn?.addEventListener("click", () => {
  displayDirection = "both";
  updateDirectionButtons();
  renderRouteMap(routes.find((route) => route.id === selectedRouteId));
});

showOutboundBtn?.addEventListener("click", () => {
  displayDirection = "outbound";
  updateDirectionButtons();
  renderRouteMap(routes.find((route) => route.id === selectedRouteId));
});

showInboundBtn?.addEventListener("click", () => {
  displayDirection = "inbound";
  updateDirectionButtons();
  renderRouteMap(routes.find((route) => route.id === selectedRouteId));
});

editorOutboundBtn?.addEventListener("click", () => {
  editorDirection = "outbound";
  updateEditorDirectionButtons();
  renderDirectionTable();
});

editorInboundBtn?.addEventListener("click", () => {
  editorDirection = "inbound";
  updateEditorDirectionButtons();
  renderDirectionTable();
});

addDirectionStopBtn?.addEventListener("click", addStopToDirection);
saveDirectionBtn?.addEventListener("click", saveDirectionStops);
previewRuntimeBtn?.addEventListener("click", () => previewRuntimeConfig(false));
downloadRuntimeBtn?.addEventListener("click", () => previewRuntimeConfig(true));

updateDirectionButtons();
updateEditorDirectionButtons();
loadRoutes();
