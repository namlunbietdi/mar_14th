const savedUser = localStorage.getItem("busSystemUser");
const currentUser = document.getElementById("currentUser");
const logoutBtn = document.getElementById("logoutBtn");
const userMenuButton = document.getElementById("userMenuButton");
const userDropdown = document.getElementById("userDropdown");
const editProfileBtn = document.getElementById("editProfileBtn");

function getStoredUser() {
  return savedUser ? JSON.parse(savedUser) : null;
}

async function authFetch(url, options = {}) {
  const user = getStoredUser();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (user?.id) {
    headers["x-user-id"] = user.id;
  }

  return fetch(url, {
    ...options,
    headers
  });
}

window.busApp = {
  getStoredUser,
  authFetch
};

if (!savedUser) {
  window.location.href = "/";
} else if (currentUser) {
  const user = getStoredUser();
  const displayName = user.fullName || user.username;
  const displayRole = user.role || "manager";
  currentUser.textContent = `${displayName} (${displayRole})`;
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("busSystemUser");
  window.location.href = "/";
});

userMenuButton?.addEventListener("click", () => {
  userDropdown?.classList.toggle("open");
});

editProfileBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  alert("Chuc nang chinh sua thong tin ca nhan se duoc phat trien o buoc tiep theo.");
  userDropdown?.classList.remove("open");
});

document.addEventListener("click", (event) => {
  if (!userMenuButton || !userDropdown) {
    return;
  }

  const clickedInsideMenu = userMenuButton.contains(event.target) || userDropdown.contains(event.target);

  if (!clickedInsideMenu) {
    userDropdown.classList.remove("open");
  }
});
