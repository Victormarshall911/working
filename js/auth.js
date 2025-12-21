/**
 * Happy Family Commission Agency - Authentication & Utilities
 *
 * This script handles:
 * - Supabase Initialization
 * - Global State (User)
 * - Toast Notifications
 * - Authentication (Login/Logout)
 * - Password Visibility Toggle
 */

// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL = "https://zxgqfimgldsxgjewmoyi.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3FmaW1nbGRzeGdqZXdtb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDE3NzAsImV4cCI6MjA4MTA3Nzc3MH0.GBadxzt4jidJLrrG106YK5FBzrJiQTsuIAZvA_0PqkU";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// GLOBAL STATE
// ============================================

let currentUser = null;

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

/**
 * Show a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
function showToast(title, message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  // Icon mapping for each toast type
  const icons = {
    success: "fa-check",
    error: "fa-times",
    warning: "fa-exclamation",
    info: "fa-info",
  };

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${icons[type]}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="closeToast(this)">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove toast after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-hiding");
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/**
 * Close a specific toast
 * @param {HTMLElement} button - The close button element
 */
function closeToast(button) {
  const toast = button.closest(".toast");
  if (toast) {
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 300);
  }
}

// Make toast functions globally accessible
window.showToast = showToast;
window.closeToast = closeToast;

// ============================================
// AUTHENTICATION LOGIC
// ============================================

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value;
  const passwordInput = document.getElementById("password").value;
  const btn = document.querySelector(".btn-login");
  
  // Elements for UI switching
  const loginPage = document.getElementById("loginPage");
  // We need to access loadAdminDashboard/loadUserDashboard from app.js
  // Since they are global, we can call them.

  btn.textContent = "Logging in...";

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("username", usernameInput)
    .eq("password", passwordInput)
    .single();

  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';

  if (error || !data) {
    showToast(
      "Login Failed",
      "Invalid username or password. Please try again.",
      "error"
    );
    return;
  }

  currentUser = data;
  loginPage.style.display = "none";

  // Show welcome toast
  const welcomeName = currentUser.full_name || currentUser.username || "User";
  showToast("Welcome Back!", `Logged in as ${welcomeName}`, "success");

  if (currentUser.role === "admin") {
    if (typeof loadAdminDashboard === 'function') {
      loadAdminDashboard();
    } else {
      console.error("loadAdminDashboard is not defined. Check app.js loading.");
    }
  } else {
    if (typeof loadUserDashboard === 'function') {
      loadUserDashboard();
    } else {
      console.error("loadUserDashboard is not defined. Check app.js loading.");
    }
  }
}

function handleLogout() {
  const loginPage = document.getElementById("loginPage");
  const adminPage = document.getElementById("adminPage");
  const userPage = document.getElementById("userPage");

  showToast("Signed Out", "You have been logged out successfully.", "info");
  currentUser = null;
  loginPage.style.display = "block";
  adminPage.style.display = "none";
  userPage.style.display = "none";
  document.getElementById("loginForm").reset();
}

// ============================================
// UI HELPERS
// ============================================

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  // Select the icon itself since it has the class toggle-password
  const toggleIcon = document.querySelector(".toggle-password");

  if (!passwordInput || !toggleIcon) return;

  // Toggle input type
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}

// Make globally accessible
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.togglePasswordVisibility = togglePasswordVisibility;

// Auto-initialize password toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggleIcon = document.querySelector(".toggle-password");
  if (toggleIcon) {
    toggleIcon.addEventListener("click", togglePasswordVisibility);
  }
});
