/**
 * Happy Family Commission Agency - Main Application Script
 *
 * This script handles:
 * - User authentication (login/logout)
 * - Admin dashboard functionality (user management, deposits, withdrawals)
 * - User dashboard functionality
 * - Toast notifications
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
let selectedUserId = null;
const currentYear = new Date().getFullYear();
let allUsers = [];
let currentPage = 1;
const itemsPerPage = 5;

// ============================================
// DOM ELEMENTS
// ============================================

const loginPage = document.getElementById("loginPage");
const adminPage = document.getElementById("adminPage");
const userPage = document.getElementById("userPage");

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
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  updateDateDisplay();
});

function setupEventListeners() {
  // ... (keep existing Auth listeners) ...
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("userLogoutBtn").addEventListener("click", handleLogout);

  // ... (keep existing Add User listeners) ...
  document.getElementById("addUserBtn").addEventListener("click", () => openModal("userModal"));
  document.getElementById("closeModal").addEventListener("click", () => closeModal("userModal"));
  document.getElementById("cancelModal").addEventListener("click", () => closeModal("userModal"));
  document.getElementById("addUserForm").addEventListener("submit", handleRegisterUser);

  // --- NEW: EDIT USER LISTENERS ---
  document.getElementById("closeEditModal").addEventListener("click", () => closeModal("editUserModal"));
  document.getElementById("cancelEditModal").addEventListener("click", () => closeModal("editUserModal"));
  document.getElementById("editUserForm").addEventListener("submit", saveUserEdits);
  // --------------------------------

  // ... (keep existing Deposit/Withdrawal listeners) ...
  document.getElementById("closeDepositModal").addEventListener("click", () => closeModal("depositModal"));
  document.getElementById("cancelDepositModal").addEventListener("click", () => closeModal("depositModal"));
  document.getElementById("confirmDepositModal").addEventListener("click", saveDepositChanges);

  document.getElementById("closeWithdrawalModal").addEventListener("click", () => closeModal("withdrawalModal"));
  document.getElementById("cancelWithdrawalModal").addEventListener("click", () => closeModal("withdrawalModal"));
  document.getElementById("confirmWithdrawalModal").addEventListener("click", saveWithdrawalChanges);

  // ... (keep existing Global/Quick Actions) ...
  document.getElementById("globalDepositBtn").addEventListener("click", focusOnTable);
  document.getElementById("globalWithdrawalBtn").addEventListener("click", focusOnTable);
  document.getElementById("exportBtn").addEventListener("click", exportToCSV);
  document.getElementById("printBtn").addEventListener("click", printReport);
  document.getElementById("notifyBtn").addEventListener("click", () => alert("Notification system coming soon!"));

  // ... (keep existing Search) ...
  document.getElementById("userSearch").addEventListener("input", (e) => filterUsers(e.target.value));
  document.getElementById("prevPageBtn").addEventListener("click", () => changePage(-1));
  document.getElementById("nextPageBtn").addEventListener("click", () => changePage(1));
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value;
  const passwordInput = document.getElementById("password").value;
  const btn = document.querySelector(".btn-login");

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
    loadAdminDashboard();
  } else {
    loadUserDashboard();
  }
}

function handleLogout() {
  showToast("Signed Out", "You have been logged out successfully.", "info");
  currentUser = null;
  loginPage.style.display = "block";
  adminPage.style.display = "none";
  userPage.style.display = "none";
  document.getElementById("loginForm").reset();
}

// --- ADMIN DASHBOARD LOGIC ---
async function loadAdminDashboard() {
  adminPage.style.display = "block";
  await fetchUsers();
  updateDashboardStats();
}

async function fetchUsers() {
    console.log("🔄 Fetching users...");

    // 1. Fetch ALL profiles without database filters (removes potential bugs)
    const { data: users, error } = await sb
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error);
        showToast("Error", "Could not load users.", "error");
        return;
    }

    // 2. Filter out Admins using JavaScript (More reliable)
    // We check if role is 'admin' (case-insensitive)
    allUsers = users.filter(u => (u.role || '').toLowerCase() !== 'admin');

    console.log(`✅ Loaded ${allUsers.length} users.`, allUsers);
    
    // 3. Update the UI
    renderUserTable();
}
function renderUserTable(usersToRender = null) {
  const list = usersToRender || allUsers;
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  document.getElementById("totalUsers").textContent = allUsers.length;

  const totalPages = Math.ceil(list.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = list.slice(start, end);

  const pageIndicator = document.getElementById("pageIndicator");
  if (pageIndicator)
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;

  document.getElementById("prevPageBtn").disabled = currentPage === 1;
  document.getElementById("nextPageBtn").disabled = currentPage >= totalPages;

  paginatedItems.forEach((user) => {
    const daily = Number(user.daily_amount) || 0;
    const balance = Number(user.balance) || 0;

    // We escape single quotes in strings to prevent JS errors in the onclick
    const safeId = user.id;
    const safeName = (user.full_name || "").replace(/'/g, "\\'");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.member_id || "-"}</td> 
      <td>${user.full_name}</td>
      <td>${user.username}</td>
      <td>${user.email || "-"}</td>
      <td>₦${daily.toLocaleString()}</td>
      <td>₦${balance.toLocaleString()}</td>
      <td>-</td>
      <td><span class="status-active"><i class="fas fa-circle"></i> Active</span></td>
      <td>
        <button class="btn-action btn-edit" title="Manage Deposits" onclick="openDepositManager('${safeId}', '${safeName}', ${daily})">
          <i class="fas fa-plus-circle"></i>
        </button>
        <button class="btn-action btn-delete" title="Manage Withdrawals" onclick="openWithdrawalManager('${safeId}', '${safeName}', ${balance})">
          <i class="fas fa-minus-circle"></i>
        </button>
        
        <button class="btn-action" style="background:#f59e0b; color:white;" title="Edit User" onclick="openEditUserModal('${safeId}')">
          <i class="fas fa-pen"></i>
        </button>

        <button class="btn-action" style="background:#dc2626; color:white;" title="Delete User" onclick="deleteUser('${safeId}', '${safeName}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function changePage(direction) {
  const totalPages = Math.ceil(allUsers.length / itemsPerPage);
  if (direction === 1 && currentPage < totalPages) {
    currentPage++;
  } else if (direction === -1 && currentPage > 1) {
    currentPage--;
  }
  renderUserTable();
}

function exportToCSV() {
  if (allUsers.length === 0) {
    alert("No data to export");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Full Name,Username,Email,Phone,Daily Amount,Balance\n";

  allUsers.forEach((user) => {
    const row = [
      user.id,
      user.full_name,
      user.username,
      user.email,
      user.phone,
      user.daily_amount,
      user.balance,
    ].join(",");
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "happy_family_users.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function printReport() {
  window.print();
}

function focusOnTable() {
  const searchBox = document.getElementById("userSearch");
  searchBox.scrollIntoView({ behavior: "smooth" });
  searchBox.focus();
  searchBox.style.borderColor = "var(--accent-orange)";
  setTimeout(() => {
    searchBox.style.borderColor = "var(--light-gray)";
  }, 1000);
}

// --- WITHDRAWAL LOGIC ---
async function openWithdrawalManager(userId, userName, currentBalance) {
  selectedUserId = userId;

  document.getElementById("withdrawalUserName").textContent = userName;
  document.getElementById(
    "withdrawalUserAmount"
  ).textContent = `Current Balance: ₦${currentBalance.toLocaleString()}`;
  document.getElementById("withdrawalAmountInput").value = "";

  const yearSelect = document.getElementById("withdrawalYearSelect");
  yearSelect.innerHTML = "";

  const baseYear = 2025;
  for (let i = 0; i < 10; i++) {
    const loopYear = baseYear + i;
    const opt = document.createElement("option");
    opt.value = loopYear;
    opt.textContent = `Session ${i + 1}`;
    if (loopYear === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  renderWithdrawalCalendar(currentYear, userId);
  yearSelect.onchange = (e) =>
    renderWithdrawalCalendar(Number.parseInt(e.target.value), userId);

  openModal("withdrawalModal");
}

async function renderWithdrawalCalendar(year, userId) {
  const container = document.getElementById("withdrawalMonthsContainer");
  container.innerHTML = "Loading withdrawal history...";

  const startDate = new Date(year, 0, 1);
  const totalDays = 24 * 31;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + totalDays);

  const { data: transactions } = await sb
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "withdrawal")
    .gte("transaction_date", formatDate(startDate))
    .lt("transaction_date", formatDate(endDate));

  container.innerHTML = "";
  let yearlyWithdrawn = 0;

  if (transactions.length === 0) {
    container.innerHTML =
      '<p style="padding:10px; text-align:center;">No withdrawals found for this session.</p>';
  } else {
    const list = document.createElement("ul");
    list.style.listStyle = "none";

    transactions.forEach((t) => {
      yearlyWithdrawn += t.amount;
      const item = document.createElement("li");
      item.className = "summary-item";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px;">
          <span>${t.transaction_date}</span>
          <strong style="color:var(--alert-red)">-₦${t.amount.toLocaleString()}</strong>
        </div>
      `;
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  document.getElementById(
    "withdrawalYearlyTotal"
  ).textContent = `₦${yearlyWithdrawn.toLocaleString()}`;
}

async function saveWithdrawalChanges() {
  const amountInput = document.getElementById("withdrawalAmountInput");
  const amountVal = amountInput.value.trim();

  if (!amountVal || amountVal <= 0) {
    showToast(
      "Invalid Amount",
      "Please enter a valid amount to withdraw.",
      "warning"
    );
    return;
  }

  const amount = Number.parseFloat(amountVal);

  const { data: user } = await sb
    .from("profiles")
    .select("balance")
    .eq("id", selectedUserId)
    .single();
  const currentBal = Number(user.balance) || 0;

  if (currentBal < amount) {
    showToast(
      "Insufficient Funds",
      `User only has ₦${currentBal.toLocaleString()} available.`,
      "error"
    );
    return;
  }

  const btn = document.getElementById("confirmWithdrawalModal");
  btn.textContent = "Processing...";

  const today = new Date().toISOString().split("T")[0];
  const { error } = await sb.from("transactions").insert([
    {
      user_id: selectedUserId,
      type: "withdrawal",
      amount: amount,
      transaction_date: today,
      description: "Manual Withdrawal",
    },
  ]);

  if (error) {
    showToast("Withdrawal Failed", error.message, "error");
    btn.textContent = "Confirm Withdrawal";
    return;
  }

  await sb
    .from("profiles")
    .update({ balance: currentBal - amount })
    .eq("id", selectedUserId);

  showToast(
    "Withdrawal Successful",
    `₦${amount.toLocaleString()} has been withdrawn.`,
    "success"
  );
  closeModal("withdrawalModal");
  btn.textContent = "Confirm Withdrawal";
  loadAdminDashboard();
}

// --- DEPOSIT LOGIC (FIXED) ---
async function openDepositManager(userId, userName, dailyAmount) {
  selectedUserId = userId;

  document.getElementById("depositUserName").textContent = userName;
  document.getElementById(
    "depositUserAmount"
  ).textContent = `Daily Amount: ₦${dailyAmount.toLocaleString()}`;

  const yearSelect = document.getElementById("depositYearSelect");
  yearSelect.innerHTML = "";

  const baseYear = 2025;
  for (let i = 0; i < 10; i++) {
    const opt = document.createElement("option");
    opt.value = i + 1; // Session number: 1, 2, 3...
    opt.textContent = `Session ${i + 1}`;
    if (i === 0) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  renderDepositCalendar(1, userId); // Start with session 1
  openModal("depositModal");

  yearSelect.onchange = (e) =>
    renderDepositCalendar(Number.parseInt(e.target.value), userId);
}

async function renderDepositCalendar(sessionNumber, userId) {
  const container = document.getElementById("depositMonthsContainer");
  container.innerHTML =
    '<p style="text-align:center; padding:20px;">Loading 24-month cycle...</p>';

  // Each session starts 3 years apart to avoid overlap
  // Session 1: 2025, Session 2: 2028, Session 3: 2031, etc.
  const baseYear = 2025;
  const sessionStartYear = baseYear + (sessionNumber - 1) * 3;
  const startDate = new Date(sessionStartYear, 0, 1); // January 1st of session year

  // Calculate end date (744 days = 24 months × 31 days)
  const totalDays = 24 * 31;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + totalDays);

  // Fetch existing deposits for this session's date range
  const { data: transactions } = await sb
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "deposit")
    .gte("transaction_date", formatDate(startDate))
    .lt("transaction_date", formatDate(endDate));

  const depositedDates = new Set(
    transactions?.map((t) => t.transaction_date) || []
  );

  container.innerHTML = "";
  let cycleTotal = 0;

  // Track current date as we iterate through 24 months × 31 days
  const currentDate = new Date(startDate);

  for (let monthIndex = 0; monthIndex < 24; monthIndex++) {
    const monthSection = document.createElement("div");
    monthSection.className = "month-section";

    let daysHTML = "";
    let monthCount = 0;

    for (let dayOffset = 0; dayOffset < 31; dayOffset++) {
      const dateStr = formatDate(currentDate);
      const isDeposited = depositedDates.has(dateStr);
      if (isDeposited) monthCount++;

      daysHTML += `
        <div class="checkbox-day ${isDeposited ? "deposited" : ""}">
          <label>${dayOffset + 1}</label>
          <input type="checkbox" 
                 class="deposit-checkbox" 
                 data-date="${dateStr}" 
                 ${isDeposited ? "checked" : ""}>
        </div>
      `;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    cycleTotal += monthCount * getDailyAmount();

    const gridId = `month-grid-${monthIndex}`;
    const masterCheckboxId = `master-checkbox-${monthIndex}`;
    const allChecked = monthCount === 31;

    monthSection.innerHTML = `
      <div class="month-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="checkbox" 
                 id="${masterCheckboxId}"
                 title="Select All 31 Days"
                 style="width: 18px; height: 18px; cursor: pointer;"
                 ${allChecked ? "checked" : ""}
                 onchange="toggleMonth(this, '${gridId}')">
          <h4>Month ${monthIndex + 1}</h4>
        </div>
        <div class="month-summary"><span>${monthCount} Checked</span></div>
      </div>
      <div class="checkbox-grid" id="${gridId}">
        ${daysHTML}
      </div>
    `;
    container.appendChild(monthSection);
  }

  document.getElementById(
    "depositYearlyTotal"
  ).textContent = `₦${cycleTotal.toLocaleString()}`;
}

// --- USER DASHBOARD LOGIC ---
async function loadUserDashboard() {
  try {
    userPage.style.display = "block";

    const fullName = currentUser.full_name || "Member";
    const balance = Number(currentUser.balance) || 0;
    const daily = Number(currentUser.daily_amount) || 0;
    const memberId = currentUser.member_id || "---";

    document.getElementById("currentUserName").textContent = fullName;
    document.getElementById("displayUserName").textContent = fullName;

    const idElement = document.querySelector(".user-id");
    if (idElement) idElement.textContent = `Member ID: ${memberId}`;

    document.getElementById(
      "currentBalance"
    ).textContent = `₦${balance.toLocaleString()}`;
    document.getElementById(
      "dailyTargetAmount"
    ).textContent = `₦${daily.toLocaleString()}`;

    const { data: transactions } = await sb
      .from("transactions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("transaction_date", { ascending: false })
      .limit(30);

    const tbody = document.getElementById("transactionTableBody");
    tbody.innerHTML = "";

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>#${tx.id.slice(0, 8)}</td>
          <td>${tx.description || tx.type}</td>
          <td>₦${Number(tx.amount).toLocaleString()}</td>
          <td><span class="${
            tx.type === "deposit" ? "type-deposit" : "type-withdrawal"
          }">${tx.type}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;">No recent transactions.</td></tr>';
    }
  } catch (err) {
    console.error("Dashboard Error:", err);
    alert(
      "Error loading dashboard data. Please verify your internet connection."
    );
    userPage.style.display = "block";
  }
}

function openEditUserModal(userId) {
  // Find the user in our local list
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  // Populate fields
  document.getElementById("editUserId").value = user.id;
  document.getElementById("editMemberId").value = user.member_id || "";
  document.getElementById("editUsername").value = user.username || "";
  document.getElementById("editPin").value = user.password || ""; // Showing PIN
  document.getElementById("editPhone").value = user.phone || "";
  document.getElementById("editDailyAmount").value = user.daily_amount || 0;
  document.getElementById("editEmail").value = user.email || "";

  openModal("editUserModal");
}

async function saveUserEdits(e) {
  e.preventDefault();
  
  const userId = document.getElementById("editUserId").value;
  const btn = document.querySelector("#editUserForm .btn-save");
  
  // Get values
  const updates = {
    member_id: document.getElementById("editMemberId").value.trim(),
    password: document.getElementById("editPin").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    daily_amount: document.getElementById("editDailyAmount").value,
    email: document.getElementById("editEmail").value.trim(),
    // We usually update full_name if it changes, here assuming username logic stays
  };

  btn.textContent = "Saving...";

  const { error } = await sb
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  btn.textContent = "Save Changes";

  if (error) {
    showToast("Update Failed", error.message, "error");
  } else {
    showToast("Success", "User details updated successfully.", "success");
    closeModal("editUserModal");
    fetchUsers(); // Refresh table
  }
}

async function deleteUser(userId, userName) {
  // Confirmation Alert
  const confirmed = confirm(`Are you sure you want to PERMANENTLY DELETE ${userName}?\n\nThis will remove their account and ALL transaction history.\nThis action cannot be undone.`);
  
  if (!confirmed) return;

  // 1. Delete Transactions first (Foreign Key Constraint)
  const { error: txError } = await sb
    .from('transactions')
    .delete()
    .eq('user_id', userId);

  if (txError) {
    showToast("Error", "Could not delete transaction history: " + txError.message, "error");
    return;
  }

  // 2. Delete Profile
  const { error: userError } = await sb
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (userError) {
    showToast("Error", "Could not delete user profile: " + userError.message, "error");
  } else {
    showToast("Deleted", `${userName} has been deleted.`, "success");
    fetchUsers(); // Refresh table
  }
}

// --- UTILITIES ---
function openModal(modalId) {
  document.getElementById(modalId).style.display = "flex";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

function updateDateDisplay() {
  const dateEl = document.getElementById("todayDate");
  if (dateEl)
    dateEl.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
}

function filterUsers(query) {
    const lowerQuery = query.trim().toLowerCase();
    
    const filtered = allUsers.filter(user => 
        (user.full_name || '').toLowerCase().includes(lowerQuery) || 
        (user.username || '').toLowerCase().includes(lowerQuery) ||
        (user.member_id || '').toLowerCase().includes(lowerQuery) // <-- Now searches ID too
    );
    
    renderUserTable(filtered);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailyAmount() {
  const text = document.getElementById("depositUserAmount").textContent;
  return Number.parseInt(text.replace(/[^0-9]/g, ""));
}

async function saveDepositChanges() {
  const checkboxes = document.querySelectorAll(".deposit-checkbox");
  const amount = getDailyAmount();
  const btn = document.getElementById("confirmDepositModal");

  btn.textContent = "Saving...";

  const sessionNumber = Number.parseInt(
    document.getElementById("depositYearSelect").value
  );
  const baseYear = 2025;
  const sessionStartYear = baseYear + (sessionNumber - 1) * 3;
  const startDate = new Date(sessionStartYear, 0, 1);
  const totalDays = 24 * 31;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + totalDays);

  // Fetch existing deposits for this session's date range only
  const { data: existingTx, error: fetchError } = await sb
    .from("transactions")
    .select("transaction_date, id")
    .eq("user_id", selectedUserId)
    .eq("type", "deposit")
    .gte("transaction_date", formatDate(startDate))
    .lt("transaction_date", formatDate(endDate));

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    alert("Error fetching existing deposits");
    btn.textContent = "Confirm Deposits";
    return;
  }

  const existingMap = new Map(
    existingTx?.map((t) => [t.transaction_date, t.id]) || []
  );
  const toInsert = [];
  const toDeleteIds = [];

  checkboxes.forEach((box) => {
    const date = box.dataset.date;
    const isChecked = box.checked;
    const hasRecord = existingMap.has(date);

    if (isChecked && !hasRecord) {
      toInsert.push({
        user_id: selectedUserId,
        type: "deposit",
        amount: amount,
        transaction_date: date,
        description: "Daily Contribution",
      });
    } else if (!isChecked && hasRecord) {
      toDeleteIds.push(existingMap.get(date));
    }
  });

  // Delete unchecked
  if (toDeleteIds.length > 0) {
    const { error: deleteError } = await sb
      .from("transactions")
      .delete()
      .in("id", toDeleteIds);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      alert("Error deleting deposits: " + deleteError.message);
      btn.textContent = "Confirm Deposits";
      return;
    }
  }

  // Insert newly checked
  if (toInsert.length > 0) {
    const { error: insertError } = await sb
      .from("transactions")
      .insert(toInsert);

    if (insertError) {
      alert("Error saving deposits: " + insertError.message);
      btn.textContent = "Confirm Deposits";
      return;
    }
  }

  // Recalculate balance from ALL transactions
  const { data: allDeposits } = await sb
    .from("transactions")
    .select("amount")
    .eq("user_id", selectedUserId)
    .eq("type", "deposit");

  const { data: allWithdrawals } = await sb
    .from("transactions")
    .select("amount")
    .eq("user_id", selectedUserId)
    .eq("type", "withdrawal");

  const totalDeposits =
    allDeposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalWithdrawals =
    allWithdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const correctBalance = totalDeposits - totalWithdrawals;

  const { error: updateError } = await sb
    .from("profiles")
    .update({ balance: correctBalance })
    .eq("id", selectedUserId);

  if (updateError) {
    console.error("Update error:", updateError);
    showToast(
      "Update Failed",
      "Error updating balance: " + updateError.message,
      "error"
    );
    btn.textContent = "Confirm Deposits";
    return;
  }

  btn.textContent = "Confirm Deposits";
  closeModal("depositModal");
  showToast(
    "Deposits Updated",
    "All deposit changes have been saved successfully.",
    "success"
  );
  loadAdminDashboard();
}

function toggleMonth(masterCheckbox, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const checkboxes = grid.querySelectorAll(".deposit-checkbox");
  checkboxes.forEach((box) => {
    box.checked = masterCheckbox.checked;
    // Also update the visual state of the parent div
    const parent = box.closest(".checkbox-day");
    if (parent) {
      if (masterCheckbox.checked) {
        parent.classList.add("deposited");
      } else {
        parent.classList.remove("deposited");
      }
    }
  });

  // Update the month summary count
  const monthSection = grid.closest(".month-section");
  if (monthSection) {
    const summarySpan = monthSection.querySelector(".month-summary span");
    if (summarySpan) {
      const checkedCount = masterCheckbox.checked ? 31 : 0;
      summarySpan.textContent = `${checkedCount} Checked`;
    }
  }
}

// Toggles the visibility of the password input field
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.querySelector(".toggle-password i");

  if (!passwordInput || !toggleIcon) return;

  // Toggle input type
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  }
}

// Make functions globally accessible
window.openDepositManager = openDepositManager;
window.openWithdrawalManager = openWithdrawalManager;
window.toggleMonth = toggleMonth;
window.togglePasswordVisibility = togglePasswordVisibility;

function updateDashboardStats() {
  sb.from("profiles")
    .select("balance")
    .then(({ data: profiles }) => {
      const total = profiles.reduce(
        (acc, curr) => acc + (curr.balance || 0),
        0
      );
      document.getElementById(
        "totalBalance"
      ).textContent = `₦${total.toLocaleString()}`;
    });
}

function handleRegisterUser(e) {
  e.preventDefault();

  const memberId = document.getElementById("newMemberId").value.trim();
  const username = document
    .getElementById("newUsername")
    .value.trim()
    .toLowerCase();
  const pin = document.getElementById("newPin").value.trim();
  const phone = document.getElementById("newPhone").value.trim();
  const amount = document.getElementById("dailyProposedAmount").value;

  if (pin.length < 4 || isNaN(pin)) {
    showToast("Invalid PIN", "Please enter a valid 4-digit PIN.", "warning");
    return;
  }

  const newUser = {
    member_id: memberId,
    username: username,
    password: pin,
    phone: phone,
    daily_amount: amount,
    full_name: username,
    email: "",
    role: "user",
    balance: 0,
  };

  sb.from("profiles")
    .insert([newUser])
    .then(({ error }) => {
      if (error) {
        showToast("Registration Failed", error.message, "error");
      } else {
        showToast(
          "User Registered",
          `New member registered with ID: ${memberId}`,
          "success"
        );
        closeModal("userModal");
        document.getElementById("addUserForm").reset();
        fetchUsers();
      }
    });
}
// Make functions globally accessible
window.openDepositManager = openDepositManager;
window.openWithdrawalManager = openWithdrawalManager;
window.toggleMonth = toggleMonth;
window.togglePasswordVisibility = togglePasswordVisibility;
// Add these lines:
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;
