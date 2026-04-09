/**
 * Happy Family Commission Agency - Main Application Script
 *
 * This script handles:
 * - User authentication (login/logout)
 * - Admin dashboard functionality (user management, deposits, withdrawals)
 * - User dashboard functionality
 * - Toast notifications
 * - Loading skeletons
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

  const icons = {
    success: "fa-check",
    error: "fa-times",
    warning: "fa-exclamation",
    info: "fa-info",
  };

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
// LOADING SKELETON SYSTEM
// ============================================

/**
 * Show loading skeleton for the user table
 */
function showTableSkeleton() {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 120px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 150px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 90px;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 70px;"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

/**
 * Show loading skeleton for sidebar stats
 */
function showStatsSkeleton() {
  document.getElementById("totalUsers").innerHTML =
    '<div class="skeleton skeleton-stat"></div>';
  document.getElementById("totalBalance").innerHTML =
    '<div class="skeleton skeleton-stat"></div>';
  const todayDeposits = document.getElementById("todayDeposits");
  if (todayDeposits)
    todayDeposits.innerHTML = '<div class="skeleton skeleton-stat"></div>';
}

/**
 * Show loading skeleton for deposit calendar
 */
function showCalendarSkeleton() {
  const container = document.getElementById("depositMonthsContainer");
  container.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const section = document.createElement("div");
    section.className = "month-section";
    section.innerHTML = `
      <div class="month-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="skeleton" style="width: 18px; height: 18px; border-radius: 4px;"></div>
          <div class="skeleton skeleton-text" style="width: 80px;"></div>
        </div>
        <div class="skeleton skeleton-text" style="width: 70px;"></div>
      </div>
      <div class="checkbox-grid">
        ${Array(31).fill('<div class="skeleton skeleton-checkbox"></div>').join("")}
      </div>
    `;
    container.appendChild(section);
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  updateDateDisplay();
});

function setupEventListeners() {
  // Auth listeners
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document
    .getElementById("userLogoutBtn")
    .addEventListener("click", handleLogout);

  // Add User listeners
  document
    .getElementById("addUserBtn")
    .addEventListener("click", () => openModal("userModal"));
  document
    .getElementById("closeModal")
    .addEventListener("click", () => closeModal("userModal"));
  document
    .getElementById("cancelModal")
    .addEventListener("click", () => closeModal("userModal"));
  document
    .getElementById("addUserForm")
    .addEventListener("submit", handleRegisterUser);

  // Edit User listeners
  document
    .getElementById("closeEditModal")
    .addEventListener("click", () => closeModal("editUserModal"));
  document
    .getElementById("cancelEditModal")
    .addEventListener("click", () => closeModal("editUserModal"));
  document
    .getElementById("editUserForm")
    .addEventListener("submit", saveUserEdits);

  // Deposit/Withdrawal listeners
  document
    .getElementById("closeDepositModal")
    .addEventListener("click", () => closeModal("depositModal"));
  document
    .getElementById("cancelDepositModal")
    .addEventListener("click", () => closeModal("depositModal"));
  document
    .getElementById("confirmDepositModal")
    .addEventListener("click", saveDepositChanges);

  document
    .getElementById("closeWithdrawalModal")
    .addEventListener("click", () => closeModal("withdrawalModal"));
  document
    .getElementById("cancelWithdrawalModal")
    .addEventListener("click", () => closeModal("withdrawalModal"));
  document
    .getElementById("confirmWithdrawalModal")
    .addEventListener("click", saveWithdrawalChanges);

  // Global/Quick Actions
  document
    .getElementById("globalDepositBtn")
    .addEventListener("click", focusOnTable);
  document
    .getElementById("globalWithdrawalBtn")
    .addEventListener("click", focusOnTable);
  document.getElementById("exportBtn").addEventListener("click", exportToCSV);
  document.getElementById("printBtn").addEventListener("click", printReport);
  document
    .getElementById("notifyBtn")
    .addEventListener("click", () => alert("Notification system coming soon!"));

  // Search & Pagination
  document
    .getElementById("userSearch")
    .addEventListener("input", (e) => filterUsers(e.target.value));
  document
    .getElementById("prevPageBtn")
    .addEventListener("click", () => changePage(-1));
  document
    .getElementById("nextPageBtn")
    .addEventListener("click", () => changePage(1));
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
      "error",
    );
    return;
  }

  currentUser = data;
  loginPage.style.display = "none";

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

// ============================================
// ADMIN DASHBOARD LOGIC
// ============================================

async function loadAdminDashboard() {
  adminPage.style.display = "block";

  // Show loading skeletons
  showTableSkeleton();
  showStatsSkeleton();

  await fetchUsers();
  updateDashboardStats();
}

async function fetchUsers() {
  let allFetchedUsers = [];
  let from = 0;
  const pageSize = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const to = from + pageSize - 1;

    const { data: chunk, error } = await sb
      .from("profiles")
      .select("*")
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Error", "Could not load full user list.", "error");
      return;
    }

    if (chunk && chunk.length > 0) {
      allFetchedUsers = allFetchedUsers.concat(chunk);
      from += pageSize;

      if (chunk.length < pageSize) {
        keepFetching = false;
      }
    } else {
      keepFetching = false;
    }
  }

  allUsers = allFetchedUsers.filter(
    (u) => (u.role || "").toLowerCase() !== "admin",
  );
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

// ============================================
// WITHDRAWAL LOGIC
// ============================================

async function openWithdrawalManager(userId, userName, currentBalance) {
  selectedUserId = userId;

  document.getElementById("withdrawalUserName").textContent = userName;
  document.getElementById("withdrawalUserAmount").textContent =
    `Current Balance: ₦${currentBalance.toLocaleString()}`;
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

  document.getElementById("withdrawalYearlyTotal").textContent =
    `₦${yearlyWithdrawn.toLocaleString()}`;
}

async function saveWithdrawalChanges() {
  const amountInput = document.getElementById("withdrawalAmountInput");
  const amountVal = amountInput.value.trim();

  if (!amountVal || amountVal <= 0) {
    showToast(
      "Invalid Amount",
      "Please enter a valid amount to withdraw.",
      "warning",
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
      "error",
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
    "success",
  );
  closeModal("withdrawalModal");
  btn.textContent = "Confirm Withdrawal";
  loadAdminDashboard();
}

// ============================================
// SESSION DATE RANGE HELPER
// ============================================

function getSessionDateRange(sessionNumber) {
  const baseYear = 2025;
  const sessionStartYear = baseYear + (sessionNumber - 1) * 3;
  const startDate = new Date(sessionStartYear, 0, 1);

  const totalDays = 24 * 31;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + totalDays);

  return {
    startDate,
    endDate,
    startStr: formatDate(startDate),
    endStr: formatDate(endDate),
  };
}

function getSessionForDate(transactionDate) {
  const totalSessions = 10;

  for (let session = 1; session <= totalSessions; session++) {
    const { startStr, endStr } = getSessionDateRange(session);

    if (transactionDate >= startStr && transactionDate < endStr) {
      return session;
    }
  }

  return 0;
}

// ============================================
// DEPOSIT LOGIC
// ============================================

async function openDepositManager(userId, userName, dailyAmount) {
  selectedUserId = userId;

  document.getElementById("depositUserName").textContent = userName;
  document.getElementById("depositUserAmount").textContent =
    `Daily Amount: ₦${dailyAmount.toLocaleString()}`;

  const yearSelect = document.getElementById("depositYearSelect");
  yearSelect.innerHTML = "";

  const totalSessions = 10;

  // Show skeleton while loading
  showCalendarSkeleton();
  openModal("depositModal");

  const { data: allTx, error } = await sb
    .from("transactions")
    .select("transaction_date")
    .eq("user_id", userId)
    .eq("type", "deposit")
    .order("transaction_date", { ascending: false });

  let latestSession = 1;

  if (allTx && allTx.length > 0) {
    let highestSessionWithActivity = 0;

    for (const tx of allTx) {
      const sessionNum = getSessionForDate(tx.transaction_date);
      if (sessionNum > highestSessionWithActivity) {
        highestSessionWithActivity = sessionNum;
      }
    }

    if (highestSessionWithActivity > 0) {
      latestSession = highestSessionWithActivity;
    }
  }

  for (let i = 1; i <= totalSessions; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Session ${i}`;
    if (i === latestSession) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  renderDepositCalendar(latestSession, userId);

  yearSelect.onchange = (e) =>
    renderDepositCalendar(Number.parseInt(e.target.value), userId);
}

async function renderDepositCalendar(sessionNumber, userId) {
  const container = document.getElementById("depositMonthsContainer");
  showCalendarSkeleton();

  const { startDate, startStr, endStr } = getSessionDateRange(sessionNumber);

  const { data: transactions } = await sb
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "deposit")
    .gte("transaction_date", startStr)
    .lt("transaction_date", endStr);

  const depositedDates = new Set(
    transactions?.map((t) => t.transaction_date) || [],
  );

  container.innerHTML = "";

  // Add "Select All" controls at the top
  const selectAllControls = document.createElement("div");
  selectAllControls.className = "select-all-controls";
  selectAllControls.innerHTML = `
    <div class="select-all-buttons">
      <button type="button" class="btn-select-all" onclick="selectAllMonths(12, true)">
        <i class="fas fa-check-double"></i> Select First 12 Months
      </button>
      <button type="button" class="btn-select-all" onclick="selectAllMonths(24, true)">
        <i class="fas fa-check-double"></i> Select All 24 Months
      </button>
      <button type="button" class="btn-deselect-all" onclick="selectAllMonths(24, false)">
        <i class="fas fa-times"></i> Deselect All
      </button>
    </div>
  `;
  container.appendChild(selectAllControls);

  let cycleTotal = 0;
  const currentDate = new Date(startDate);

  for (let monthIndex = 0; monthIndex < 24; monthIndex++) {
    const monthSection = document.createElement("div");
    monthSection.className = "month-section";
    monthSection.dataset.monthIndex = monthIndex;

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
                 data-month="${monthIndex}"
                 ${isDeposited ? "checked" : ""}>
        </div>
      `;

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

  document.getElementById("depositYearlyTotal").textContent =
    `₦${cycleTotal.toLocaleString()}`;
}

/**
 * Select or deselect all months up to the specified count
 * @param {number} monthCount - Number of months to select (12 or 24)
 * @param {boolean} checked - Whether to check or uncheck
 */
function selectAllMonths(monthCount, checked) {
  const container = document.getElementById("depositMonthsContainer");
  const monthSections = container.querySelectorAll(".month-section");

  monthSections.forEach((section, index) => {
    if (index < monthCount) {
      const gridId = `month-grid-${index}`;
      const masterCheckbox = document.getElementById(
        `master-checkbox-${index}`,
      );

      if (masterCheckbox) {
        masterCheckbox.checked = checked;
        toggleMonth(masterCheckbox, gridId);
      }
    }
  });

  // Update the yearly total
  updateDepositYearlyTotal();

  const action = checked ? "selected" : "deselected";
  showToast("Bulk Selection", `${monthCount} months ${action}`, "info", 2000);
}

/**
 * Update the yearly total display based on checked boxes
 */
function updateDepositYearlyTotal() {
  const checkboxes = document.querySelectorAll(".deposit-checkbox:checked");
  const dailyAmount = getDailyAmount();
  const total = checkboxes.length * dailyAmount;
  document.getElementById("depositYearlyTotal").textContent =
    `₦${total.toLocaleString()}`;
}

// ============================================
// USER DASHBOARD LOGIC
// ============================================

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

    document.getElementById("currentBalance").textContent =
      `₦${balance.toLocaleString()}`;
    document.getElementById("dailyTargetAmount").textContent =
      `₦${daily.toLocaleString()}`;

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
          <td><span class="${tx.type === "deposit" ? "type-deposit" : "type-withdrawal"}">${tx.type}</span></td>
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
      "Error loading dashboard data. Please verify your internet connection.",
    );
    userPage.style.display = "block";
  }
}

// ============================================
// EDIT USER MODAL
// ============================================

function openEditUserModal(userId) {
  const user = allUsers.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("editUserId").value = user.id;
  document.getElementById("editMemberId").value = user.member_id || "";
  document.getElementById("editUsername").value = user.username || "";
  document.getElementById("editPin").value = user.password || "";
  document.getElementById("editPhone").value = user.phone || "";
  document.getElementById("editDailyAmount").value = user.daily_amount || 0;
  document.getElementById("editEmail").value = user.email || "";

  openModal("editUserModal");
}

async function saveUserEdits(e) {
  e.preventDefault();

  const userId = document.getElementById("editUserId").value;
  const btn = document.querySelector("#editUserForm .btn-save");

  const updates = {
    member_id: document.getElementById("editMemberId").value.trim(),
    password: document.getElementById("editPin").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    daily_amount: document.getElementById("editDailyAmount").value,
    email: document.getElementById("editEmail").value.trim(),
  };

  btn.textContent = "Saving...";

  const { error } = await sb.from("profiles").update(updates).eq("id", userId);

  btn.textContent = "Save Changes";

  if (error) {
    showToast("Update Failed", error.message, "error");
  } else {
    showToast("Success", "User details updated successfully.", "success");
    closeModal("editUserModal");
    fetchUsers();
  }
}

async function deleteUser(userId, userName) {
  const confirmed = confirm(
    `Are you sure you want to PERMANENTLY DELETE ${userName}?\n\nThis will remove their account and ALL transaction history.\nThis action cannot be undone.`,
  );

  if (!confirmed) return;

  const { error: txError } = await sb
    .from("transactions")
    .delete()
    .eq("user_id", userId);

  if (txError) {
    showToast(
      "Error",
      "Could not delete transaction history: " + txError.message,
      "error",
    );
    return;
  }

  const { error: userError } = await sb
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (userError) {
    showToast(
      "Error",
      "Could not delete user profile: " + userError.message,
      "error",
    );
  } else {
    showToast("Deleted", `${userName} has been deleted.`, "success");
    fetchUsers();
  }
}

// ============================================
// UTILITIES
// ============================================

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

  const filtered = allUsers.filter(
    (user) =>
      (user.full_name || "").toLowerCase().includes(lowerQuery) ||
      (user.username || "").toLowerCase().includes(lowerQuery) ||
      (user.member_id || "").toLowerCase().includes(lowerQuery),
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

// ============================================
// SAVE DEPOSIT CHANGES
// ============================================

async function saveDepositChanges() {
  const checkboxes = document.querySelectorAll(".deposit-checkbox");
  const amount = getDailyAmount();
  const btn = document.getElementById("confirmDepositModal");

  btn.textContent = "Saving...";
  btn.disabled = true;

  const sessionNumber = Number.parseInt(
    document.getElementById("depositYearSelect").value,
  );
  const { startStr, endStr } = getSessionDateRange(sessionNumber);

  const { data: existingTx, error: fetchError } = await sb
    .from("transactions")
    .select("transaction_date, id")
    .eq("user_id", selectedUserId)
    .eq("type", "deposit")
    .gte("transaction_date", startStr)
    .lt("transaction_date", endStr);

  if (fetchError) {
    showToast("Error", "Error fetching existing deposits", "error");
    btn.textContent = "Confirm Deposits";
    btn.disabled = false;
    return;
  }

  const existingMap = new Map(
    existingTx?.map((t) => [t.transaction_date, t.id]) || [],
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
      showToast(
        "Error",
        "Error deleting deposits: " + deleteError.message,
        "error",
      );
      btn.textContent = "Confirm Deposits";
      btn.disabled = false;
      return;
    }
  }

  // Insert newly checked
  if (toInsert.length > 0) {
    const { error: insertError } = await sb
      .from("transactions")
      .insert(toInsert);

    if (insertError) {
      showToast(
        "Error",
        "Error saving deposits: " + insertError.message,
        "error",
      );
      btn.textContent = "Confirm Deposits";
      btn.disabled = false;
      return;
    }
  }

  // Recalculate balance from ALL transactions using pagination
  let allDeposits = [];
  let depositFrom = 0;
  const pageSize = 1000;
  let keepFetchingDeposits = true;

  while (keepFetchingDeposits) {
    const { data: depositChunk, error: depositFetchError } = await sb
      .from("transactions")
      .select("id, amount, transaction_date")
      .eq("user_id", selectedUserId)
      .eq("type", "deposit")
      .range(depositFrom, depositFrom + pageSize - 1);

    if (depositFetchError) break;

    if (depositChunk && depositChunk.length > 0) {
      allDeposits = allDeposits.concat(depositChunk);
      depositFrom += pageSize;
      if (depositChunk.length < pageSize) keepFetchingDeposits = false;
    } else {
      keepFetchingDeposits = false;
    }
  }

  let allWithdrawals = [];
  let withdrawalFrom = 0;
  let keepFetchingWithdrawals = true;

  while (keepFetchingWithdrawals) {
    const { data: withdrawalChunk, error: withdrawalFetchError } = await sb
      .from("transactions")
      .select("id, amount, transaction_date")
      .eq("user_id", selectedUserId)
      .eq("type", "withdrawal")
      .range(withdrawalFrom, withdrawalFrom + pageSize - 1);

    if (withdrawalFetchError) break;

    if (withdrawalChunk && withdrawalChunk.length > 0) {
      allWithdrawals = allWithdrawals.concat(withdrawalChunk);
      withdrawalFrom += pageSize;
      if (withdrawalChunk.length < pageSize) keepFetchingWithdrawals = false;
    } else {
      keepFetchingWithdrawals = false;
    }
  }

  const totalDeposits = allDeposits.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const totalWithdrawals = allWithdrawals.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  );
  const correctBalance = totalDeposits - totalWithdrawals;

  const { error: updateError } = await sb
    .from("profiles")
    .update({ balance: correctBalance })
    .eq("id", selectedUserId)
    .select();

  if (updateError) {
    showToast(
      "Update Failed",
      "Error updating balance: " + updateError.message,
      "error",
    );
    btn.textContent = "Confirm Deposits";
    btn.disabled = false;
    return;
  }

  const userIndex = allUsers.findIndex((u) => u.id === selectedUserId);
  if (userIndex !== -1) {
    allUsers[userIndex].balance = correctBalance;
  }

  btn.textContent = "Confirm Deposits";
  btn.disabled = false;
  closeModal("depositModal");
  showToast(
    "Deposits Updated",
    `Balance updated to ₦${correctBalance.toLocaleString()}`,
    "success",
  );

  await loadAdminDashboard();
}

// ============================================
// TOGGLE MONTH (Select/Deselect all days in a month)
// ============================================

function toggleMonth(masterCheckbox, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const checkboxes = grid.querySelectorAll(".deposit-checkbox");
  checkboxes.forEach((box) => {
    box.checked = masterCheckbox.checked;
    const parent = box.closest(".checkbox-day");
    if (parent) {
      if (masterCheckbox.checked) {
        parent.classList.add("deposited");
      } else {
        parent.classList.remove("deposited");
      }
    }
  });

  const monthSection = grid.closest(".month-section");
  if (monthSection) {
    const summarySpan = monthSection.querySelector(".month-summary span");
    if (summarySpan) {
      const checkedCount = masterCheckbox.checked ? 31 : 0;
      summarySpan.textContent = `${checkedCount} Checked`;
    }
  }

  // Update yearly total
  updateDepositYearlyTotal();
}

// ============================================
// PASSWORD VISIBILITY TOGGLE
// ============================================

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.querySelector(".toggle-password i");

  if (!passwordInput || !toggleIcon) return;

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

// ============================================
// DASHBOARD STATS
// ============================================

function updateDashboardStats() {
  sb.from("profiles")
    .select("balance")
    .then(({ data: profiles }) => {
      const total = profiles.reduce(
        (acc, curr) => acc + (curr.balance || 0),
        0,
      );
      document.getElementById("totalBalance").textContent =
        `₦${total.toLocaleString()}`;
    });
}

// ============================================
// REGISTER NEW USER
// ============================================

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
          "success",
        );
        closeModal("userModal");
        document.getElementById("addUserForm").reset();
        fetchUsers();
      }
    });
}

// ============================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE
// ============================================

window.openDepositManager = openDepositManager;
window.openWithdrawalManager = openWithdrawalManager;
window.toggleMonth = toggleMonth;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;
window.selectAllMonths = selectAllMonths;
