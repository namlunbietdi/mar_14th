const currentPersonnelUser = window.busApp?.getStoredUser();
const employeeTableBody = document.getElementById("employeeTableBody");
const employeePageMessage = document.getElementById("employeePageMessage");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const searchEmployeeBtn = document.getElementById("searchEmployeeBtn");
const employeeCodeSortBtn = document.getElementById("employeeCodeSortBtn");
const employeeCodeSortIcon = document.getElementById("employeeCodeSortIcon");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
const importEmployeesBtn = document.getElementById("importEmployeesBtn");
const exportEmployeesBtn = document.getElementById("exportEmployeesBtn");
const employeeImportInput = document.getElementById("employeeImportInput");
const openEmployeeModalBtn = document.getElementById("openEmployeeModalBtn");
const employeeModal = document.getElementById("employeeModal");
const closeEmployeeModalBtn = document.getElementById("closeEmployeeModalBtn");
const cancelEmployeeModalBtn = document.getElementById("cancelEmployeeModalBtn");
const employeeForm = document.getElementById("employeeForm");
const editingEmployeeId = document.getElementById("editingEmployeeId");
const employeeModalTitle = document.getElementById("employeeModalTitle");
const employeeModalSubtitle = document.getElementById("employeeModalSubtitle");
const employeeFormMessage = document.getElementById("employeeFormMessage");
const formEmployeeCode = document.getElementById("formEmployeeCode");
const formEmployeeName = document.getElementById("formEmployeeName");
const formEmployeeBirthDate = document.getElementById("formEmployeeBirthDate");
const formEmployeePosition = document.getElementById("formEmployeePosition");
const formEmployeeStatus = document.getElementById("formEmployeeStatus");

let employees = [];
let employeeCodeSortDirection = "asc";

if (currentPersonnelUser?.role !== "admin") {
  openEmployeeModalBtn.style.display = "none";
  importEmployeesBtn.style.display = "none";
  downloadTemplateBtn.style.display = "none";
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

async function downloadCsvFromApi(url, filename) {
  try {
    const response = await window.busApp.authFetch(url, {
      headers: {}
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Không thể tai file CSV.");
    }

    const csvBlob = await response.blob();
    downloadBlob(csvBlob, filename, "text/csv;charset=utf-8;");
  } catch (error) {
    setEmployeePageMessage(error.message, "error");
  }
}

function setEmployeePageMessage(message, type = "") {
  employeePageMessage.textContent = message;
  employeePageMessage.className = `inline-message ${type}`.trim();
}

function setEmployeeFormMessage(message, type = "") {
  employeeFormMessage.textContent = message;
  employeeFormMessage.className = `inline-message ${type}`.trim();
}

function closeEmployeeModal() {
  employeeModal.classList.add("hidden");
}

async function loadNextEmployeeCode() {
  try {
    const response = await window.busApp.authFetch("/api/employees/next-code");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể tai ma nhân viên.");
    }

    formEmployeeCode.value = data.employeeCode;
  } catch (error) {
    formEmployeeCode.value = "";
    setEmployeeFormMessage(error.message, "error");
  }
}

async function openEmployeeModal(mode, employee = null) {
  if (currentPersonnelUser?.role !== "admin") {
    return;
  }

  employeeForm.reset();
  setEmployeeFormMessage("");
  editingEmployeeId.value = employee?.id || "";

  if (mode === "edit" && employee) {
    employeeModalTitle.textContent = "Chỉnh sửa nhân viên";
    employeeModalSubtitle.textContent = "Cap nhat thông tin nhan su trong he thong.";
    formEmployeeCode.value = employee.employeeCode;
    formEmployeeName.value = employee.fullName;
    formEmployeeBirthDate.value = employee.birthDate.slice(0, 10);
    formEmployeePosition.value = employee.position;
    formEmployeeStatus.value = employee.status;
  } else {
    employeeModalTitle.textContent = "Them nhân viên";
    employeeModalSubtitle.textContent = "Nhap thông tin nhan su de them vao he thong.";
    await loadNextEmployeeCode();
  }

  employeeModal.classList.remove("hidden");
}

function getStatusLabel(status) {
  return status === "working" ? "Đang làm việc" : "Da nghi";
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("vi-VN");
}

function sortEmployeesByCode(items) {
  return [...items].sort((firstEmployee, secondEmployee) => {
    const compareResult = firstEmployee.employeeCode.localeCompare(secondEmployee.employeeCode, undefined, {
      numeric: true
    });

    return employeeCodeSortDirection === "asc" ? compareResult : -compareResult;
  });
}

function updateSortButton() {
  employeeCodeSortIcon.textContent = employeeCodeSortDirection === "asc" ? "â†‘" : "â†“";
}

function renderEmployees() {
  if (!employees.length) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="6">Chưa co nhân viên nao.</td>
      </tr>
    `;
    return;
  }

  const isAdmin = currentPersonnelUser?.role === "admin";
  const sortedEmployees = sortEmployeesByCode(employees);

  employeeTableBody.innerHTML = sortedEmployees
    .map((employee) => {
      const actionCell = isAdmin
        ? `
          <div class="action-group">
            <button class="link-btn" type="button" data-action="edit" data-id="${employee.id}">Sua</button>
            <button class="link-btn danger" type="button" data-action="delete" data-id="${employee.id}">Xoa</button>
          </div>
        `
        : `<span class="muted-text">Không co quyen</span>`;

      return `
        <tr>
          <td>${employee.employeeCode}</td>
          <td>${employee.fullName}</td>
          <td>${formatDate(employee.birthDate)}</td>
          <td>${employee.position}</td>
          <td><span class="status-badge ${employee.status}">${getStatusLabel(employee.status)}</span></td>
          <td>${actionCell}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadEmployees(search = "") {
  setEmployeePageMessage("Đang tải danh sach nhan su...");

  try {
    const response = await window.busApp.authFetch(`/api/employees?search=${encodeURIComponent(search)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể tai du lieu.");
    }

    employees = data.employees;
    renderEmployees();
    setEmployeePageMessage(`Đã tải ${employees.length} nhân viên.`, "success");
  } catch (error) {
    employeeTableBody.innerHTML = `
      <tr>
        <td colspan="6">${error.message}</td>
      </tr>
    `;
    setEmployeePageMessage(error.message, "error");
  }
}

async function deleteEmployee(employeeId) {
  const confirmed = window.confirm("Ban co chac chan muon xoa nhân viên nay không?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await window.busApp.authFetch(`/api/employees/${employeeId}`, {
      method: "DELETE"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể xoa nhân viên.");
    }

    setEmployeePageMessage(data.message, "success");
    loadEmployees(employeeSearchInput.value.trim());
  } catch (error) {
    setEmployeePageMessage(error.message, "error");
  }
}

employeeTableBody.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const employeeId = event.target.dataset.id;

  if (!action || !employeeId) {
    return;
  }

  const selectedEmployee = employees.find((employee) => employee.id === employeeId);

  if (action === "edit" && selectedEmployee) {
    openEmployeeModal("edit", selectedEmployee);
  }

  if (action === "delete") {
    deleteEmployee(employeeId);
  }
});

searchEmployeeBtn.addEventListener("click", () => {
  loadEmployees(employeeSearchInput.value.trim());
});

employeeSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadEmployees(employeeSearchInput.value.trim());
  }
});

employeeCodeSortBtn.addEventListener("click", () => {
  employeeCodeSortDirection = employeeCodeSortDirection === "asc" ? "desc" : "asc";
  updateSortButton();
  renderEmployees();
});

downloadTemplateBtn.addEventListener("click", () => {
  downloadCsvFromApi("/api/employees/export-template", "mau-import-nhan-su.csv");
});

exportEmployeesBtn.addEventListener("click", () => {
  downloadCsvFromApi("/api/employees/export", "danh-sach-nhan-su.csv");
});

importEmployeesBtn.addEventListener("click", () => {
  employeeImportInput.click();
});

employeeImportInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const csvContent = await file.text();
    const response = await window.busApp.authFetch("/api/employees/import", {
      method: "POST",
      body: JSON.stringify({ csvContent })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể import file CSV.");
    }

    setEmployeePageMessage(data.message, "success");
    loadEmployees(employeeSearchInput.value.trim());
  } catch (error) {
    setEmployeePageMessage(error.message, "error");
  } finally {
    employeeImportInput.value = "";
  }
});

openEmployeeModalBtn.addEventListener("click", () => {
  openEmployeeModal("create");
});

closeEmployeeModalBtn.addEventListener("click", closeEmployeeModal);
cancelEmployeeModalBtn.addEventListener("click", closeEmployeeModal);

employeeModal.addEventListener("click", (event) => {
  if (event.target === employeeModal) {
    closeEmployeeModal();
  }
});

employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setEmployeeFormMessage("");

  const payload = {
    fullName: formEmployeeName.value.trim(),
    birthDate: formEmployeeBirthDate.value,
    position: formEmployeePosition.value.trim(),
    status: formEmployeeStatus.value
  };

  const isEditing = Boolean(editingEmployeeId.value);
  const url = isEditing ? `/api/employees/${editingEmployeeId.value}` : "/api/employees";
  const method = isEditing ? "PUT" : "POST";

  try {
    const response = await window.busApp.authFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không thể luu nhân viên.");
    }

    setEmployeePageMessage(data.message, "success");
    closeEmployeeModal();
    loadEmployees(employeeSearchInput.value.trim());
  } catch (error) {
    setEmployeeFormMessage(error.message, "error");
  }
});

loadEmployees();
updateSortButton();

