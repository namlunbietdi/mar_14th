const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMessage.textContent = "Dang kiem tra thong tin...";
  loginMessage.className = "form-message";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Dang nhap that bai.");
    }

    localStorage.setItem("busSystemUser", JSON.stringify(data.user));
    loginMessage.textContent = "Dang nhap thanh cong. Dang chuyen trang...";
    loginMessage.className = "form-message success";

    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 600);
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = "form-message error";
  }
});
