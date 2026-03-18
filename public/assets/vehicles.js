const currentVehicleUser = window.busApp?.getStoredUser();
const vehicleTableBody = document.getElementById("vehicleTableBody");
const vehiclePageMessage = document.getElementById("vehiclePageMessage");
const openVehicleTypeModalBtn = document.getElementById("openVehicleTypeModalBtn");
const openVehicleModalBtn = document.getElementById("openVehicleModalBtn");
const vehicleTypeModal = document.getElementById("vehicleTypeModal");
const closeVehicleTypeModalBtn = document.getElementById("closeVehicleTypeModalBtn");
const cancelVehicleTypeModalBtn = document.getElementById("cancelVehicleTypeModalBtn");
const vehicleTypeForm = document.getElementById("vehicleTypeForm");
const vehicleBrandInput = document.getElementById("vehicleBrandInput");
const vehicleModelInput = document.getElementById("vehicleModelInput");
const vehicleCapacityInput = document.getElementById("vehicleCapacityInput");
const vehicleTypeFormMessage = document.getElementById("vehicleTypeFormMessage");
const vehicleTypeTableBody = document.getElementById("vehicleTypeTableBody");
const vehicleModal = document.getElementById("vehicleModal");
const closeVehicleModalBtn = document.getElementById("closeVehicleModalBtn");
const cancelVehicleModalBtn = document.getElementById("cancelVehicleModalBtn");
const vehicleModalTitle = document.getElementById("vehicleModalTitle");
const vehicleForm = document.getElementById("vehicleForm");
const editingVehicleId = document.getElementById("editingVehicleId");
const vehicleLicensePlateInput = document.getElementById("vehicleLicensePlateInput");
const vehicleBrandSelect = document.getElementById("vehicleBrandSelect");
const vehicleTypeSelect = document.getElementById("vehicleTypeSelect");
const vehicleCapacityDisplay = document.getElementById("vehicleCapacityDisplay");
const vehicleOperationDateInput = document.getElementById("vehicleOperationDateInput");
const vehicleStatusSelect = document.getElementById("vehicleStatusSelect");
const vehicleFormMessage = document.getElementById("vehicleFormMessage");

let vehicleTypes = [];
let vehicles = [];

if (currentVehicleUser?.role !== "admin") {
  openVehicleTypeModalBtn.style.display = "none";
  openVehicleModalBtn.style.display = "none";
}

function setVehiclePageMessage(message, type = "") {
  vehiclePageMessage.textContent = message;
  vehiclePageMessage.className = `inline-message ${type}`.trim();
}

function setVehicleTypeFormMessage(message, type = "") {
  vehicleTypeFormMessage.textContent = message;
  vehicleTypeFormMessage.className = `inline-message ${type}`.trim();
}

function setVehicleFormMessage(message, type = "") {
  vehicleFormMessage.textContent = message;
  vehicleFormMessage.className = `inline-message ${type}`.trim();
}

function closeVehicleTypeModal() {
  vehicleTypeModal.classList.add("hidden");
}

function closeVehicleModal() {
  vehicleModal.classList.add("hidden");
}

function formatVehicleDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("vi-VN");
}

function getVehicleStatusLabel(status) {
  if (status === "active") return "Hoat dong";
  if (status === "maintenance") return "Bao tri";
  return "Dung hoat dong";
}

function renderVehicleTypesTable() {
  if (!vehicleTypes.length) {
    vehicleTypeTableBody.innerHTML = `<tr><td colspan="4">Chua co loai phuong tien.</td></tr>`;
    return;
  }

  const canManage = currentVehicleUser?.role === "admin";
  vehicleTypeTableBody.innerHTML = vehicleTypes
    .map((vehicleType) => `
      <tr>
        <td>${vehicleType.brand}</td>
        <td>${vehicleType.modelName}</td>
        <td>${vehicleType.capacity}</td>
        <td>${canManage ? `<button class="link-btn danger" type="button" data-action="delete-type" data-id="${vehicleType.id}">Xoa</button>` : '<span class="muted-text">Khong co quyen</span>'}</td>
      </tr>
    `)
    .join("");
}

function renderBrandOptions() {
  const brands = [...new Set(vehicleTypes.map((vehicleType) => vehicleType.brand))];
  vehicleBrandSelect.innerHTML = brands.map((brand) => `<option value="${brand}">${brand}</option>`).join("");
  renderTypeOptions();
}

function renderTypeOptions(selectedTypeId = "") {
  const filteredTypes = vehicleTypes.filter((vehicleType) => vehicleType.brand === vehicleBrandSelect.value);
  vehicleTypeSelect.innerHTML = filteredTypes
    .map((vehicleType) => `<option value="${vehicleType.id}" ${vehicleType.id === selectedTypeId ? "selected" : ""}>${vehicleType.modelName}</option>`)
    .join("");
  updateCapacityDisplay();
}

function updateCapacityDisplay() {
  const selectedType = vehicleTypes.find((vehicleType) => vehicleType.id === vehicleTypeSelect.value);
  vehicleCapacityDisplay.value = selectedType ? `${selectedType.capacity} cho` : "";
}

function renderVehicles() {
  if (!vehicles.length) {
    vehicleTableBody.innerHTML = `<tr><td colspan="8">Chua co phuong tien nao.</td></tr>`;
    return;
  }

  const canManage = currentVehicleUser?.role === "admin";
  vehicleTableBody.innerHTML = vehicles
    .map((vehicle) => `
      <tr>
        <td>${vehicle.licensePlate}</td>
        <td>${vehicle.brand}</td>
        <td>${vehicle.modelName}</td>
        <td>${vehicle.capacity}</td>
        <td>${formatVehicleDate(vehicle.operationStartDate)}</td>
        <td>${formatVehicleDate(vehicle.expiryDate)}</td>
        <td><span class="status-badge ${vehicle.status === "active" ? "working" : "left"}">${getVehicleStatusLabel(vehicle.status)}</span></td>
        <td>${canManage ? `<div class="action-group"><button class="link-btn" type="button" data-action="edit-vehicle" data-id="${vehicle.id}">Sua</button><button class="link-btn danger" type="button" data-action="delete-vehicle" data-id="${vehicle.id}">Xoa</button></div>` : '<span class="muted-text">Khong co quyen</span>'}</td>
      </tr>
    `)
    .join("");
}

async function loadVehicles() {
  setVehiclePageMessage("Dang tai danh sach phuong tien...");
  try {
    const [vehicleTypesResponse, vehiclesResponse] = await Promise.all([
      window.busApp.authFetch("/api/vehicle-types"),
      window.busApp.authFetch("/api/vehicles")
    ]);
    const vehicleTypesData = await vehicleTypesResponse.json();
    const vehiclesData = await vehiclesResponse.json();

    if (!vehicleTypesResponse.ok) throw new Error(vehicleTypesData.message || "Khong the tai loai phuong tien.");
    if (!vehiclesResponse.ok) throw new Error(vehiclesData.message || "Khong the tai danh sach phuong tien.");

    vehicleTypes = vehicleTypesData.vehicleTypes;
    vehicles = vehiclesData.vehicles;
    renderVehicleTypesTable();
    renderBrandOptions();
    renderVehicles();
    setVehiclePageMessage(`Da tai ${vehicles.length} phuong tien.`, "success");
  } catch (error) {
    vehicleTableBody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
    setVehiclePageMessage(error.message, "error");
  }
}

openVehicleTypeModalBtn?.addEventListener("click", () => {
  setVehicleTypeFormMessage("");
  vehicleTypeForm.reset();
  vehicleTypeModal.classList.remove("hidden");
});

closeVehicleTypeModalBtn?.addEventListener("click", closeVehicleTypeModal);
cancelVehicleTypeModalBtn?.addEventListener("click", closeVehicleTypeModal);
vehicleTypeModal?.addEventListener("click", (event) => {
  if (event.target === vehicleTypeModal) closeVehicleTypeModal();
});

vehicleTypeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const response = await window.busApp.authFetch("/api/vehicle-types", {
      method: "POST",
      body: JSON.stringify({
        brand: vehicleBrandInput.value.trim(),
        modelName: vehicleModelInput.value.trim(),
        capacity: vehicleCapacityInput.value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the them loai phuong tien.");
    setVehiclePageMessage(data.message, "success");
    closeVehicleTypeModal();
    await loadVehicles();
  } catch (error) {
    setVehicleTypeFormMessage(error.message, "error");
  }
});

vehicleTypeTableBody?.addEventListener("click", async (event) => {
  if (event.target.dataset.action !== "delete-type") return;
  if (!window.confirm("Ban co chac chan muon xoa loai phuong tien nay khong?")) return;
  try {
    const response = await window.busApp.authFetch(`/api/vehicle-types/${event.target.dataset.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the xoa loai phuong tien.");
    setVehiclePageMessage(data.message, "success");
    await loadVehicles();
  } catch (error) {
    setVehiclePageMessage(error.message, "error");
  }
});

function openVehicleModal(mode, vehicle = null) {
  if (currentVehicleUser?.role !== "admin") return;
  vehicleForm.reset();
  setVehicleFormMessage("");
  editingVehicleId.value = vehicle?.id || "";
  vehicleModalTitle.textContent = mode === "edit" ? "Chinh sua phuong tien" : "Them phuong tien";
  renderBrandOptions();

  if (mode === "edit" && vehicle) {
    vehicleLicensePlateInput.value = vehicle.licensePlate;
    vehicleBrandSelect.value = vehicle.brand;
    renderTypeOptions(vehicle.vehicleTypeId);
    vehicleOperationDateInput.value = String(vehicle.operationStartDate).slice(0, 10);
    vehicleStatusSelect.value = vehicle.status;
  } else {
    renderTypeOptions();
  }

  vehicleModal.classList.remove("hidden");
}

openVehicleModalBtn?.addEventListener("click", () => openVehicleModal("create"));
closeVehicleModalBtn?.addEventListener("click", closeVehicleModal);
cancelVehicleModalBtn?.addEventListener("click", closeVehicleModal);
vehicleModal?.addEventListener("click", (event) => {
  if (event.target === vehicleModal) closeVehicleModal();
});
vehicleBrandSelect?.addEventListener("change", () => renderTypeOptions());
vehicleTypeSelect?.addEventListener("change", updateCapacityDisplay);

vehicleForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      licensePlate: vehicleLicensePlateInput.value.trim(),
      vehicleTypeId: vehicleTypeSelect.value,
      operationStartDate: vehicleOperationDateInput.value,
      status: vehicleStatusSelect.value
    };
    const isEditing = Boolean(editingVehicleId.value);
    const response = await window.busApp.authFetch(isEditing ? `/api/vehicles/${editingVehicleId.value}` : "/api/vehicles", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Khong the luu phuong tien.");
    setVehiclePageMessage(data.message, "success");
    closeVehicleModal();
    await loadVehicles();
  } catch (error) {
    setVehicleFormMessage(error.message, "error");
  }
});

vehicleTableBody?.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const vehicleId = event.target.dataset.id;
  if (!action || !vehicleId) return;
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

  if (action === "edit-vehicle" && selectedVehicle) {
    openVehicleModal("edit", selectedVehicle);
  }

  if (action === "delete-vehicle") {
    if (!window.confirm("Ban co chac chan muon xoa phuong tien nay khong?")) return;
    try {
      const response = await window.busApp.authFetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Khong the xoa phuong tien.");
      setVehiclePageMessage(data.message, "success");
      await loadVehicles();
    } catch (error) {
      setVehiclePageMessage(error.message, "error");
    }
  }
});

loadVehicles();
