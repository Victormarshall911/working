/**
 * Happy Family Commission Agency - Main Application Script
 *
 * This script handles:
 * - Admin dashboard functionality (user management, deposits, withdrawals)
 * - User dashboard functionality
 * - Modals and Event Listeners
 */

// ============================================
// GLOBAL STATE (Extended from auth.js)
// ============================================

// 'currentUser' and 'sb' are provided by auth.js
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
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Check auth state
  if (!currentUser && (adminPage || userPage)) {
    // If trying to access protected pages without login
    window.location.href = "index.html";
    return;
  }

  // Initialize based on current page
  if (adminPage) {
    if (currentUser.role !== "admin") {
      window.location.href = "user.html";
      return;
    }
    loadAdminDashboard();
  } else if (userPage) {
    if (currentUser.role === "admin") {
      window.location.href = "admin.html";
      return;
    }
    loadUserDashboard();
  }

  setupEventListeners();
  if (typeof updateDateDisplay === "function") updateDateDisplay();
});

function setupEventListeners() {
  // Auth listeners (functions defined in auth.js)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  const userLogoutBtn = document.getElementById("userLogoutBtn");
  if (userLogoutBtn) {
    userLogoutBtn.addEventListener("click", handleLogout);
  }

  // Password Toggle
  const togglePasswordBtn = document.getElementById("togglePassword");
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
  }

  // Add User listeners
  const addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {
    addUserBtn.addEventListener("click", () => openModal("userModal"));
    document
      .getElementById("closeModal")
      .addEventListener("click", () => closeModal("userModal"));
    document
      .getElementById("cancelModal")
      .addEventListener("click", () => closeModal("userModal"));
    document
      .getElementById("addUserForm")
      .addEventListener("submit", handleRegisterUser);
  }

  // Edit User listeners
  const editUserForm = document.getElementById("editUserForm");
  if (editUserForm) {
    document
      .getElementById("closeEditModal")
      .addEventListener("click", () => closeModal("editUserModal"));
    document
      .getElementById("cancelEditModal")
      .addEventListener("click", () => closeModal("editUserModal"));
    editUserForm.addEventListener("submit", saveUserEdits);
  }

  // Deposit/Withdrawal listeners
  const depositModal = document.getElementById("depositModal");
  if (depositModal) {
    document
      .getElementById("closeDepositModal")
      .addEventListener("click", () => closeModal("depositModal"));
    document
      .getElementById("cancelDepositModal")
      .addEventListener("click", () => closeModal("depositModal"));
    document
      .getElementById("confirmDepositModal")
      .addEventListener("click", saveDepositChanges);
  }

  const withdrawalModal = document.getElementById("withdrawalModal");
  if (withdrawalModal) {
    document
      .getElementById("closeWithdrawalModal")
      .addEventListener("click", () => closeModal("withdrawalModal"));
    document
      .getElementById("cancelWithdrawalModal")
      .addEventListener("click", () => closeModal("withdrawalModal"));
    document
      .getElementById("confirmWithdrawalModal")
      .addEventListener("click", saveWithdrawalChanges);
  }

  // Global/Quick Actions
  const globalDepositBtn = document.getElementById("globalDepositBtn");
  if (globalDepositBtn) {
    globalDepositBtn.addEventListener("click", focusOnTable);
    document
      .getElementById("globalWithdrawalBtn")
      .addEventListener("click", focusOnTable);
    document.getElementById("exportBtn").addEventListener("click", exportToCSV);
    document.getElementById("printBtn").addEventListener("click", printReport);
    document
      .getElementById("notifyBtn")
      .addEventListener("click", () =>
        alert("Notification system coming soon!")
      );
  }

  // Search and Pagination
  const userSearch = document.getElementById("userSearch");
  if (userSearch) {
    userSearch.addEventListener("input", (e) => filterUsers(e.target.value));
    document
      .getElementById("prevPageBtn")
      .addEventListener("click", () => changePage(-1));
    document
      .getElementById("nextPageBtn")
      .addEventListener("click", () => changePage(1));
  }

  // Transaction Modal Listeners
  const viewAllTransactionsBtn = document.getElementById(
    "viewAllTransactionsBtn"
  );
  if (viewAllTransactionsBtn) {
    viewAllTransactionsBtn.addEventListener("click", openTransactionModal);
    document
      .getElementById("closeTransactionModal")
      .addEventListener("click", () => closeModal("transactionModal"));
    document
      .getElementById("closeTransactionModalBtn")
      .addEventListener("click", () => closeModal("transactionModal"));
  }

  // Hamburger Menu & Mobile Sidebar
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebar =
    document.querySelector(".sidebar") ||
    document.querySelector(".user-sidebar");

  if (mobileMenuBtn && sidebar && sidebarOverlay) {
    console.log("Hamburger menu initialized");

    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent bubbling
      console.log("Hamburger clicked");
      sidebar.classList.toggle("active");
      sidebarOverlay.classList.toggle("active");
    });

    sidebarOverlay.addEventListener("click", () => {
      console.log("Overlay clicked");
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
  } else {
    console.warn("Hamburger menu elements not found:", {
      btn: !!mobileMenuBtn,
      sidebar: !!sidebar,
      overlay: !!sidebarOverlay,
    });
  }
}

// ============================================
// ADMIN DASHBOARD LOGIC
// ============================================

async function loadAdminDashboard() {
  adminPage.style.display = "block";
  await fetchUsers();
  updateDashboardStats();
}

async function fetchUsers() {
  const { data: users, error } = await sb
    .from("profiles")
    .select("*")
    .neq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  allUsers = users;
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

async function openTransactionModal() {
  const tbody = document.getElementById("fullTransactionTableBody");
  tbody.innerHTML =
    '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
  openModal("transactionModal");

  try {
    const { data: transactions, error } = await sb
      .from("transactions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("transaction_date", { ascending: false });

    if (error) throw error;

    tbody.innerHTML = "";

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        const tr = document.createElement("tr");
        const dateStr = tx.transaction_date
          ? new Date(tx.transaction_date).toLocaleDateString()
          : "---";
        tr.innerHTML = `
                  <td>${dateStr}</td>
                  <td>${tx.description || tx.type}</td>
                  <td><span class="${
                    tx.type === "deposit" ? "type-deposit" : "type-withdrawal"
                  }">${tx.type}</span></td>
                  <td style="text-align: right; font-weight: 600; color: var(--dark-gray);">₦${Number(
                    tx.amount
                  ).toLocaleString()}</td>
                `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;">No transactions found.</td></tr>';
    }
  } catch (err) {
    console.error("Error fetching all transactions:", err);
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color:red;">Failed to load transactions.</td></tr>';
  }
}

// --- USER DASHBOARD LOGIC ---
async function loadUserDashboard() {
  try {
    userPage.style.display = "block";

    // FETCH FRESH USER DATA
    const { data: freshUser, error: userError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (userError) {
      console.error("Error fetching fresh user data:", userError);
    } else if (freshUser) {
      // Update global state and local storage
      currentUser = freshUser;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }

    const fullName = currentUser.full_name || "Member";
    const balance = Number(currentUser.balance) || 0;
    const daily = Number(currentUser.daily_amount) || 0;
    const memberId = currentUser.member_id || "---";

    document.getElementById("currentUserName").textContent = fullName;
    document.getElementById("displayUserName").textContent = fullName;
    const headerName = document.getElementById("headerUserName");
    if (headerName) headerName.textContent = fullName;

    const idElement = document.querySelector(".user-id");
    if (idElement) idElement.textContent = `Member ID: ${memberId}`;

    document.getElementById(
      "currentBalance"
    ).textContent = `₦${balance.toLocaleString()}`;
    document.getElementById(
      "dailyTargetAmount"
    ).textContent = `₦${daily.toLocaleString()}`;

    const { data: transactions, count } = await sb
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", currentUser.id)
      .order("transaction_date", { ascending: false })
      .limit(30);

    const txnCallback = document.getElementById("txnCallback");
    if (txnCallback)
      txnCallback.textContent =
        count || (transactions ? transactions.length : 0);

    const tbody = document.getElementById("transactionTableBody");
    tbody.innerHTML = "";

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        const tr = document.createElement("tr");
        const dateStr = tx.transaction_date
          ? new Date(tx.transaction_date).toLocaleDateString()
          : "---";
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${tx.description || tx.type}</td>
          <td><span class="${
            tx.type === "deposit" ? "type-deposit" : "type-withdrawal"
          }">${tx.type}</span></td>
          <td style="text-align: right; font-weight: 600; color: var(--dark-gray);">₦${Number(
            tx.amount
          ).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--medium-gray);">No recent transactions found.</td></tr>';
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
  const user = allUsers.find((u) => u.id === userId);
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
  };

  btn.textContent = "Saving...";

  const { error } = await sb.from("profiles").update(updates).eq("id", userId);

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
  const confirmed = confirm(
    `Are you sure you want to PERMANENTLY DELETE ${userName}?\n\nThis will remove their account and ALL transaction history.\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  // 1. Delete Transactions first (Foreign Key Constraint)
  const { error: txError } = await sb
    .from("transactions")
    .delete()
    .eq("user_id", userId);

  if (txError) {
    showToast(
      "Error",
      "Could not delete transaction history: " + txError.message,
      "error"
    );
    return;
  }

  // 2. Delete Profile
  const { error: userError } = await sb
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (userError) {
    showToast(
      "Error",
      "Could not delete user profile: " + userError.message,
      "error"
    );
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

  const filtered = allUsers.filter(
    (user) =>
      (user.full_name || "").toLowerCase().includes(lowerQuery) ||
      (user.username || "").toLowerCase().includes(lowerQuery) ||
      (user.member_id || "").toLowerCase().includes(lowerQuery) // <-- Now searches ID too
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

async function updateDashboardStats() {
  try {
    // 1. Fetch all transactions (amount + type)
    const { data: transactions, error } = await sb
      .from("transactions")
      .select("amount, type");

    if (error) throw error;

    // 2. Calculate Totals
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    if (transactions) {
      transactions.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === "deposit") {
          totalDeposits += amt;
        } else if (t.type === "withdrawal") {
          totalWithdrawals += amt;
        }
      });
    }

    // 3. Update DOM Elements (Admin Page)
    const depositEl = document.getElementById("totalDeposits");
    const withdrawalEl = document.getElementById("totalWithdrawals");

    if (depositEl) depositEl.textContent = `₦${totalDeposits.toLocaleString()}`;
    if (withdrawalEl)
      withdrawalEl.textContent = `₦${totalWithdrawals.toLocaleString()}`;
  } catch (err) {
    console.error("Error updating dashboard stats:", err);
  }
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
window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;
window.loadAdminDashboard = loadAdminDashboard;
window.loadUserDashboard = loadUserDashboard;
