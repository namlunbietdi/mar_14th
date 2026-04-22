const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMessage.textContent = "Dang kiem tra thông tin...";
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
      throw new Error(data.message || "Đăng nhập that bai.");
    }

    localStorage.setItem("busSystemUser", JSON.stringify(data.user));
    loginMessage.textContent = "Đăng nhập thành công. Dang chuyen trang...";
    loginMessage.className = "form-message success";

    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 600);
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = "form-message error";
  }
});

