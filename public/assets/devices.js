const currentDeviceUser = window.busApp?.getStoredUser();
const deviceTableBody = document.getElementById("deviceTableBody");
const devicePageMessage = document.getElementById("devicePageMessage");
const openDeviceModalBtn = document.getElementById("openDeviceModalBtn");
const deviceModal = document.getElementById("deviceModal");
const closeDeviceModalBtn = document.getElementById("closeDeviceModalBtn");
const cancelDeviceModalBtn = document.getElementById("cancelDeviceModalBtn");
const deviceModalTitle = document.getElementById("deviceModalTitle");
const deviceForm = document.getElementById("deviceForm");
const editingDeviceId = document.getElementById("editingDeviceId");
const deviceIdInput = document.getElementById("deviceIdInput");
const deviceOperationStartDateInput = document.getElementById("deviceOperationStartDateInput");
const deviceStatusSelect = document.getElementById("deviceStatusSelect");
const deviceFormMessage = document.getElementById("deviceFormMessage");

let devices = [];

if (currentDeviceUser?.role !== "admin") {
  openDeviceModalBtn.style.display = "none";
}

function setDevicePageMessage(message, type = "") {
  devicePageMessage.textContent = message;
  devicePageMessage.className = `inline-message ${type}`.trim();
}

function setDeviceFormMessage(message, type = "") {
  deviceFormMessage.textContent = message;
  deviceFormMessage.className = `inline-message ${type}`.trim();
}

function closeDeviceModal() {
  deviceModal.classList.add("hidden");
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("vi-VN");
}

function getDeviceStatusLabel(status) {
  if (status === "working") return "Lam viec";
  if (status === "issue") return "Tro ngai";
  return "Loai bo";
}

function getDeviceStatusClass(status) {
  if (status === "working") return "working";
  if (status === "issue") return "warning";
  return "left";
}

function renderDevices() {
  if (!devices.length) {
    deviceTableBody.innerHTML = `<tr><td colspan="6">Chua co thiet bi nao.</td></tr>`;
    return;
  }

  const canManage = currentDeviceUser?.role === "admin";
  deviceTableBody.innerHTML = devices
    .map((device) => `
      <tr>
        <td>${device.deviceId}</td>
        <td>${formatDate(device.operationStartDate)}</td>
        <td>${device.remainingLabel}</td>
        <td>${formatDate(device.nextMaintenanceDate)}</td>
        <td><span class="status-badge ${getDeviceStatusClass(device.status)}">${getDeviceStatusLabel(device.status)}</span></td>
        <td>${canManage ? `<div class="action-group"><button class="link-btn" type="button" data-action="edit" data-id="${device.id}">Sua</button><button class="link-btn danger" type="button" data-action="delete" data-id="${device.id}">Xoa</button></div>` : '<span class="muted-text">Khong co quyen</span>'}</td>
      </tr>
    `)
    .join("");
}

async function loadDevices() {
  setDevicePageMessage("Dang tai danh sach thiet bi...");

  try {
    const response = await window.busApp.authFetch("/api/devices");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the tai danh sach thiet bi.");
    }

    devices = data.devices;
    renderDevices();
    setDevicePageMessage(`Da tai ${devices.length} thiet bi.`, "success");
  } catch (error) {
    deviceTableBody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
    setDevicePageMessage(error.message, "error");
  }
}

function openDeviceModal(mode, device = null) {
  if (currentDeviceUser?.role !== "admin") {
    return;
  }

  deviceForm.reset();
  setDeviceFormMessage("");
  editingDeviceId.value = device?.id || "";
  deviceModalTitle.textContent = mode === "edit" ? "Chinh sua thiet bi" : "Them thiet bi";

  if (mode === "edit" && device) {
    deviceIdInput.value = device.deviceId;
    deviceOperationStartDateInput.value = String(device.operationStartDate).slice(0, 10);
    deviceStatusSelect.value = device.status;
  }

  deviceModal.classList.remove("hidden");
}

openDeviceModalBtn?.addEventListener("click", () => openDeviceModal("create"));
closeDeviceModalBtn?.addEventListener("click", closeDeviceModal);
cancelDeviceModalBtn?.addEventListener("click", closeDeviceModal);
deviceModal?.addEventListener("click", (event) => {
  if (event.target === deviceModal) {
    closeDeviceModal();
  }
});

deviceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setDeviceFormMessage("");

  const payload = {
    deviceId: deviceIdInput.value.trim(),
    operationStartDate: deviceOperationStartDateInput.value,
    status: deviceStatusSelect.value
  };

  const isEditing = Boolean(editingDeviceId.value);

  try {
    const response = await window.busApp.authFetch(isEditing ? `/api/devices/${editingDeviceId.value}` : "/api/devices", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the luu thiet bi.");
    }

    setDevicePageMessage(data.message, "success");
    closeDeviceModal();
    await loadDevices();
  } catch (error) {
    setDeviceFormMessage(error.message, "error");
  }
});

deviceTableBody?.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const deviceId = event.target.dataset.id;

  if (!action || !deviceId) {
    return;
  }

  const selectedDevice = devices.find((device) => device.id === deviceId);

  if (action === "edit" && selectedDevice) {
    openDeviceModal("edit", selectedDevice);
  }

  if (action === "delete") {
    const confirmed = window.confirm("Ban co chac chan muon xoa thiet bi nay khong?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await window.busApp.authFetch(`/api/devices/${deviceId}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Khong the xoa thiet bi.");
      }

      setDevicePageMessage(data.message, "success");
      await loadDevices();
    } catch (error) {
      setDevicePageMessage(error.message, "error");
    }
  }
});

loadDevices();
