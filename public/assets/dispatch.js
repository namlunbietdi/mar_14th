const currentDispatchUser = window.busApp?.getStoredUser();
const dispatchTableBody = document.getElementById("dispatchTableBody");
const dispatchPageMessage = document.getElementById("dispatchPageMessage");
const dispatchTotalCount = document.getElementById("dispatchTotalCount");
const dispatchRunningCount = document.getElementById("dispatchRunningCount");
const dispatchAssignedCount = document.getElementById("dispatchAssignedCount");
const refreshDispatchBtn = document.getElementById("refreshDispatchBtn");
const openDispatchModalBtn = document.getElementById("openDispatchModalBtn");
const dispatchModal = document.getElementById("dispatchModal");
const closeDispatchModalBtn = document.getElementById("closeDispatchModalBtn");
const cancelDispatchModalBtn = document.getElementById("cancelDispatchModalBtn");
const dispatchModalTitle = document.getElementById("dispatchModalTitle");
const dispatchModalSubtitle = document.getElementById("dispatchModalSubtitle");
const dispatchForm = document.getElementById("dispatchForm");
const editingDispatchId = document.getElementById("editingDispatchId");
const dispatchOrderCodeInput = document.getElementById("dispatchOrderCodeInput");
const dispatchStatusSelect = document.getElementById("dispatchStatusSelect");
const dispatchRouteSelect = document.getElementById("dispatchRouteSelect");
const dispatchVehicleSelect = document.getElementById("dispatchVehicleSelect");
const dispatchDriverSelect = document.getElementById("dispatchDriverSelect");
const dispatchConductorSelect = document.getElementById("dispatchConductorSelect");
const dispatchDeviceSelect = document.getElementById("dispatchDeviceSelect");
const dispatchAssignmentNoteInput = document.getElementById("dispatchAssignmentNoteInput");
const dispatchPlannedStartInput = document.getElementById("dispatchPlannedStartInput");
const dispatchPlannedEndInput = document.getElementById("dispatchPlannedEndInput");
const dispatchActualStartInput = document.getElementById("dispatchActualStartInput");
const dispatchActualEndInput = document.getElementById("dispatchActualEndInput");
const dispatchNoteInput = document.getElementById("dispatchNoteInput");
const dispatchFormMessage = document.getElementById("dispatchFormMessage");

let dispatchOrders = [];
let dispatchMetadata = {
  routes: [],
  vehicles: [],
  employees: [],
  devices: []
};
let editingOrderContext = null;

if (currentDispatchUser?.role !== "admin") {
  openDispatchModalBtn.style.display = "none";
}

function setDispatchPageMessage(message, type = "") {
  dispatchPageMessage.textContent = message;
  dispatchPageMessage.className = `inline-message ${type}`.trim();
}

function setDispatchFormMessage(message, type = "") {
  dispatchFormMessage.textContent = message;
  dispatchFormMessage.className = `inline-message ${type}`.trim();
}

function closeDispatchModal() {
  editingOrderContext = null;
  dispatchModal.classList.add("hidden");
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN");
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getDispatchStatusLabel(status) {
  if (status === "running") return "Đang chạy";
  if (status === "completed") return "Hoan thanh";
  if (status === "cancelled") return "Huy";
  return "Ke hoach";
}

function renderDispatchStats() {
  dispatchTotalCount.textContent = dispatchOrders.length;
  dispatchRunningCount.textContent = dispatchOrders.filter((order) => order.status === "running").length;
  dispatchAssignedCount.textContent = dispatchOrders.filter((order) => order.deviceId).length;
}

function renderDispatchTable() {
  if (!dispatchOrders.length) {
    dispatchTableBody.innerHTML = `<tr><td colspan="8">Chưa co lenh điều phối nao.</td></tr>`;
    renderDispatchStats();
    return;
  }

  const canManage = currentDispatchUser?.role === "admin";
  dispatchTableBody.innerHTML = dispatchOrders
    .map((order) => `
      <tr>
        <td>${order.orderCode}</td>
        <td>${order.routeNumber} - ${order.routeName}</td>
        <td>${order.licensePlate}</td>
        <td>${order.driverName}</td>
        <td>${order.deviceId || '<span class="muted-text">Chưa gan</span>'}</td>
        <td>${formatDateTime(order.plannedStartTime)}<br><span class="muted-text">${formatDateTime(order.plannedEndTime)}</span></td>
        <td><span class="status-badge ${order.status === "running" ? "working" : order.status === "planned" ? "warning" : "left"}">${getDispatchStatusLabel(order.status)}</span></td>
        <td>${canManage ? `<div class="action-group"><button class="link-btn" type="button" data-action="edit" data-id="${order.id}">Sua</button><button class="link-btn danger" type="button" data-action="delete" data-id="${order.id}">Xoa</button></div>` : '<span class="muted-text">Không co quyen</span>'}</td>
      </tr>
    `)
    .join("");

  renderDispatchStats();
}

function populateDispatchSelect(selectElement, items, valueKey, labelBuilder, includeEmptyOption = false) {
  const options = includeEmptyOption ? [`<option value="">Không chon</option>`] : [];
  options.push(...items.map((item) => `<option value="${item[valueKey]}">${labelBuilder(item)}</option>`));
  selectElement.innerHTML = options.join("");
}

function renderDispatchDeviceSelectOptions(order = null) {
  const options = [`<option value="">Không chon</option>`];
  const currentOrderId = order?.id || null;
  const currentDeviceCode = order?.deviceId || "";

  dispatchMetadata.devices.forEach((device) => {
    const isCurrentOrderDevice = currentDeviceCode && device.deviceId === currentDeviceCode;
    const isUnavailable = Boolean(device.isAssigned) && !(isCurrentOrderDevice || device.assignedDispatchOrderId === currentOrderId);
    const disabledAttr = isUnavailable ? "disabled" : "";
    const statusLabel = isUnavailable ? " (Dang gan lenh khac)" : "";
    options.push(`<option value="${device.id}" ${disabledAttr}>${device.deviceId}${statusLabel}</option>`);
  });

  dispatchDeviceSelect.innerHTML = options.join("");
}

async function loadDispatchMetadata() {
  const response = await window.busApp.authFetch("/api/dispatch-orders/metadata");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể tai metadata điều phối.");
  }

  dispatchMetadata = data;
  populateDispatchSelect(dispatchRouteSelect, data.routes, "id", (route) => `${route.routeNumber} - ${route.routeName}`);
  populateDispatchSelect(dispatchVehicleSelect, data.vehicles, "id", (vehicle) => vehicle.licensePlate);
  populateDispatchSelect(dispatchDriverSelect, data.employees, "id", (employee) => employee.fullName);
  populateDispatchSelect(dispatchConductorSelect, data.employees, "id", (employee) => employee.fullName, true);
  renderDispatchDeviceSelectOptions(editingOrderContext);
}

async function loadDispatchOrders() {
  setDispatchPageMessage("Đang tải lenh điều phối...");

  try {
    const response = await window.busApp.authFetch("/api/dispatch-orders");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể tai lenh điều phối.");
    }

    dispatchOrders = data.orders;
    renderDispatchTable();
    setDispatchPageMessage(`Đã tải ${dispatchOrders.length} lenh điều phối.`, "success");
  } catch (error) {
    dispatchTableBody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
    setDispatchPageMessage(error.message, "error");
  }
}

async function loadDispatchPage() {
  try {
    await loadDispatchMetadata();
    await loadDispatchOrders();
  } catch (error) {
    setDispatchPageMessage(error.message, "error");
  }
}

async function fillNextDispatchCode() {
  try {
    const response = await window.busApp.authFetch("/api/dispatch-orders/next-code");
    const data = await response.json();

    if (response.ok) {
      dispatchOrderCodeInput.value = data.orderCode || "";
    }
  } catch (error) {
    dispatchOrderCodeInput.value = "";
  }
}

function openDispatchModal(mode, order = null) {
  if (currentDispatchUser?.role !== "admin") {
    return;
  }

  dispatchForm.reset();
  setDispatchFormMessage("");
  editingOrderContext = mode === "edit" ? order : null;
  editingDispatchId.value = order?.id || "";
  dispatchModalTitle.textContent = mode === "edit" ? "Chỉnh sửa lenh điều phối" : "Them lenh điều phối";
  dispatchModalSubtitle.textContent = mode === "edit"
    ? "Cap nhat thông tin lenh, doi thiết bị hoac thay trang thai van hanh."
    : "Tao lenh van hanh moi va gan thiết bị định vị neu can.";

  if (mode === "edit" && order) {
    dispatchOrderCodeInput.value = order.orderCode;
    dispatchStatusSelect.value = order.status;
    dispatchRouteSelect.value = order.routeId;
    dispatchVehicleSelect.value = order.vehicleId;
    dispatchDriverSelect.value = order.driverId;
    dispatchConductorSelect.value = order.conductorId || "";
    renderDispatchDeviceSelectOptions(order);
    dispatchDeviceSelect.value = dispatchMetadata.devices.find((device) => device.deviceId === order.deviceId)?.id || "";
    dispatchAssignmentNoteInput.value = order.assignmentNote || "";
    dispatchPlannedStartInput.value = toDateTimeLocalValue(order.plannedStartTime);
    dispatchPlannedEndInput.value = toDateTimeLocalValue(order.plannedEndTime);
    dispatchActualStartInput.value = toDateTimeLocalValue(order.actualStartTime);
    dispatchActualEndInput.value = toDateTimeLocalValue(order.actualEndTime);
    dispatchNoteInput.value = order.note || "";
  } else {
    renderDispatchDeviceSelectOptions(null);
    fillNextDispatchCode();
    dispatchStatusSelect.value = "planned";
  }

  dispatchModal.classList.remove("hidden");
}

async function deleteDispatchOrder(orderId) {
  const confirmed = window.confirm("Ban co chac chan muon xoa lenh điều phối nay không?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await window.busApp.authFetch(`/api/dispatch-orders/${orderId}`, {
      method: "DELETE"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể xoa lenh điều phối.");
    }

    setDispatchPageMessage(data.message, "success");
    await loadDispatchOrders();
  } catch (error) {
    setDispatchPageMessage(error.message, "error");
  }
}

refreshDispatchBtn?.addEventListener("click", loadDispatchPage);
openDispatchModalBtn?.addEventListener("click", () => openDispatchModal("create"));
closeDispatchModalBtn?.addEventListener("click", closeDispatchModal);
cancelDispatchModalBtn?.addEventListener("click", closeDispatchModal);
dispatchModal?.addEventListener("click", (event) => {
  if (event.target === dispatchModal) {
    closeDispatchModal();
  }
});

dispatchForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setDispatchFormMessage("");

  const payload = {
    routeId: dispatchRouteSelect.value,
    vehicleId: dispatchVehicleSelect.value,
    driverId: dispatchDriverSelect.value,
    conductorId: dispatchConductorSelect.value || null,
    plannedStartTime: dispatchPlannedStartInput.value,
    plannedEndTime: dispatchPlannedEndInput.value,
    actualStartTime: dispatchActualStartInput.value || null,
    actualEndTime: dispatchActualEndInput.value || null,
    status: dispatchStatusSelect.value,
    note: dispatchNoteInput.value.trim(),
    deviceRefId: dispatchDeviceSelect.value || null,
    assignmentNote: dispatchAssignmentNoteInput.value.trim()
  };

  const isEditing = Boolean(editingDispatchId.value);

  try {
    const response = await window.busApp.authFetch(isEditing ? `/api/dispatch-orders/${editingDispatchId.value}` : "/api/dispatch-orders", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể luu lenh điều phối.");
    }

    setDispatchPageMessage(data.message, "success");
    closeDispatchModal();
    await loadDispatchPage();
  } catch (error) {
    setDispatchFormMessage(error.message, "error");
  }
});

dispatchTableBody?.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const orderId = event.target.dataset.id;

  if (!action || !orderId) {
    return;
  }

  const selectedOrder = dispatchOrders.find((order) => order.id === orderId);

  if (action === "edit" && selectedOrder) {
    openDispatchModal("edit", selectedOrder);
  }

  if (action === "delete") {
    deleteDispatchOrder(orderId);
  }
});

loadDispatchPage();

