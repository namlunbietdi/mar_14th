const currentAppUser = window.busApp?.getStoredUser();
const userTableBody = document.getElementById("userTableBody");
const userSearchInput = document.getElementById("userSearchInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const userPageMessage = document.getElementById("userPageMessage");
const openUserModalBtn = document.getElementById("openUserModalBtn");
const userModal = document.getElementById("userModal");
const closeUserModalBtn = document.getElementById("closeUserModalBtn");
const cancelUserModalBtn = document.getElementById("cancelUserModalBtn");
const userForm = document.getElementById("userForm");
const editingUserId = document.getElementById("editingUserId");
const userModalTitle = document.getElementById("userModalTitle");
const userModalSubtitle = document.getElementById("userModalSubtitle");
const userFormHint = document.getElementById("userFormHint");
const userFormMessage = document.getElementById("userFormMessage");
const formUsername = document.getElementById("formUsername");
const formPassword = document.getElementById("formPassword");
const formFullName = document.getElementById("formFullName");
const formPosition = document.getElementById("formPosition");
const formRole = document.getElementById("formRole");

let users = [];

if (currentAppUser?.role !== "admin") {
  openUserModalBtn.style.display = "none";
}

function setPageMessage(message, type = "") {
  userPageMessage.textContent = message;
  userPageMessage.className = `inline-message ${type}`.trim();
}

function setFormMessage(message, type = "") {
  userFormMessage.textContent = message;
  userFormMessage.className = `inline-message ${type}`.trim();
}

function closeModal() {
  userModal.classList.add("hidden");
}

function openModal(mode, user = null) {
  if (currentAppUser?.role !== "admin") {
    return;
  }

  userForm.reset();
  setFormMessage("");
  editingUserId.value = user?.id || "";

  if (mode === "edit" && user) {
    userModalTitle.textContent = "Chinh sua nguoi dung";
    userModalSubtitle.textContent = "Cap nhat thong tin va role cua tai khoan.";
    userFormHint.textContent = "Bo trong mat khau neu khong muon thay doi.";
    formUsername.value = user.username;
    formFullName.value = user.fullName;
    formPosition.value = user.position;
    formRole.value = user.role;
    formPassword.required = false;
  } else {
    userModalTitle.textContent = "Them nguoi dung";
    userModalSubtitle.textContent = "Nhap day du thong tin de tao tai khoan moi.";
    userFormHint.textContent = "Mat khau la bat buoc khi them nguoi dung moi.";
    formPassword.required = true;
  }

  userModal.classList.remove("hidden");
}

function renderUsers() {
  if (!users.length) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="5">Chua co nguoi dung phu hop.</td>
      </tr>
    `;
    return;
  }

  const isAdmin = currentAppUser?.role === "admin";

  userTableBody.innerHTML = users
    .map((user) => {
      const actionCell = isAdmin
        ? `
          <div class="action-group">
            <button class="link-btn" type="button" data-action="edit" data-id="${user.id}">Sua</button>
            <button class="link-btn warning" type="button" data-action="reset" data-id="${user.id}">Reset</button>
            <button class="link-btn danger" type="button" data-action="delete" data-id="${user.id}">Xoa</button>
          </div>
        `
        : `<span class="muted-text">Khong co quyen</span>`;

      return `
        <tr>
          <td>${user.username}</td>
          <td>${user.fullName}</td>
          <td>${user.position}</td>
          <td><span class="role-badge ${user.role}">${user.role}</span></td>
          <td>${actionCell}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadUsers(search = "") {
  setPageMessage("Dang tai danh sach nguoi dung...");

  try {
    const response = await window.busApp.authFetch(`/api/users?search=${encodeURIComponent(search)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the tai du lieu.");
    }

    users = data.users;
    renderUsers();
    setPageMessage(`Da tai ${users.length} nguoi dung.`, "success");

  } catch (error) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="5">${error.message}</td>
      </tr>
    `;
    setPageMessage(error.message, "error");
  }
}

async function deleteUser(userId) {
  const confirmed = window.confirm("Ban co chac chan muon xoa nguoi dung nay khong?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await window.busApp.authFetch(`/api/users/${userId}`, {
      method: "DELETE"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the xoa nguoi dung.");
    }

    setPageMessage(data.message, "success");
    loadUsers(userSearchInput.value.trim());
  } catch (error) {
    setPageMessage(error.message, "error");
  }
}

async function resetPassword(userId) {
  const confirmed = window.confirm("Ban co muon reset mat khau nguoi dung nay ve mac dinh 123456 khong?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await window.busApp.authFetch(`/api/users/${userId}/reset-password`, {
      method: "POST"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the reset mat khau.");
    }

    setPageMessage(data.message, "success");
  } catch (error) {
    setPageMessage(error.message, "error");
  }
}

userTableBody.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const userId = event.target.dataset.id;

  if (!action || !userId) {
    return;
  }

  const selectedUser = users.find((user) => user.id === userId);

  if (action === "edit" && selectedUser) {
    openModal("edit", selectedUser);
  }

  if (action === "delete") {
    deleteUser(userId);
  }

  if (action === "reset") {
    resetPassword(userId);
  }
});

searchUserBtn.addEventListener("click", () => {
  loadUsers(userSearchInput.value.trim());
});

userSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadUsers(userSearchInput.value.trim());
  }
});

openUserModalBtn.addEventListener("click", () => {
  openModal("create");
});

closeUserModalBtn.addEventListener("click", closeModal);
cancelUserModalBtn.addEventListener("click", closeModal);

userModal.addEventListener("click", (event) => {
  if (event.target === userModal) {
    closeModal();
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage("");

  const payload = {
    username: formUsername.value.trim(),
    password: formPassword.value,
    fullName: formFullName.value.trim(),
    position: formPosition.value.trim(),
    role: formRole.value
  };

  const isEditing = Boolean(editingUserId.value);
  const url = isEditing ? `/api/users/${editingUserId.value}` : "/api/users";
  const method = isEditing ? "PUT" : "POST";

  try {
    const response = await window.busApp.authFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Khong the luu nguoi dung.");
    }

    if (currentAppUser?.id === data.user?.id) {
      localStorage.setItem("busSystemUser", JSON.stringify(data.user));
    }

    setPageMessage(data.message, "success");
    closeModal();
    loadUsers(userSearchInput.value.trim());
  } catch (error) {
    setFormMessage(error.message, "error");
  }
});

loadUsers();
