const SUPABASE_URL = 'https://zxgqfimgldsxgjewmoyi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Z3FmaW1nbGRzeGdqZXdtb3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDE3NzAsImV4cCI6MjA4MTA3Nzc3MH0.GBadxzt4jidJLrrG106YK5FBzrJiQTsuIAZvA_0PqkU';


const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL STATE ---
let currentUser = null;
let selectedUserId = null; 
let currentYear = new Date().getFullYear();
let allUsers = []; // Store all fetched users here
let currentPage = 1;
const itemsPerPage = 5; // Adjust this number to change table rows per page

// --- DOM ELEMENTS ---
const loginPage = document.getElementById('loginPage');
const adminPage = document.getElementById('adminPage');
const userPage = document.getElementById('userPage');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateDateDisplay();
});

function setupEventListeners() {
    // Auth
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('userLogoutBtn').addEventListener('click', handleLogout);

    // Admin - User Registration
    document.getElementById('addUserBtn').addEventListener('click', () => openModal('userModal'));
    document.getElementById('closeModal').addEventListener('click', () => closeModal('userModal'));
    document.getElementById('cancelModal').addEventListener('click', () => closeModal('userModal'));
    document.getElementById('addUserForm').addEventListener('submit', handleRegisterUser);
    
    // Admin - Deposits
    document.getElementById('closeDepositModal').addEventListener('click', () => closeModal('depositModal'));
    document.getElementById('cancelDepositModal').addEventListener('click', () => closeModal('depositModal'));
    document.getElementById('confirmDepositModal').addEventListener('click', saveDepositChanges);

    // Admin - Withdrawals (NEW)
    document.getElementById('closeWithdrawalModal').addEventListener('click', () => closeModal('withdrawalModal'));
    document.getElementById('cancelWithdrawalModal').addEventListener('click', () => closeModal('withdrawalModal'));
    document.getElementById('confirmWithdrawalModal').addEventListener('click', saveWithdrawalChanges);

    // Admin - Global Buttons (Scroll to table)
    document.getElementById('globalDepositBtn').addEventListener('click', focusOnTable);
    document.getElementById('globalWithdrawalBtn').addEventListener('click', focusOnTable);

    // Admin - Quick Actions (NEW)
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('printBtn').addEventListener('click', printReport);
    document.getElementById('notifyBtn').addEventListener('click', () => alert("Notification system coming soon!"));

    // Admin - Search & Pagination
    document.getElementById('userSearch').addEventListener('input', (e) => filterUsers(e.target.value));
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
}

// --- AUTHENTICATION ---
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const btn = document.querySelector('.btn-login');

    btn.textContent = 'Logging in...';

    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('username', usernameInput)
        .eq('password', passwordInput)
        .single();

    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';

    if (error || !data) {
        alert('Invalid credentials');
        return;
    }

    currentUser = data;
    loginPage.style.display = 'none';

    if (currentUser.role === 'admin') {
        loadAdminDashboard();
    } else {
        loadUserDashboard();
    }
}

function handleLogout() {
    currentUser = null;
    loginPage.style.display = 'block';
    adminPage.style.display = 'none';
    userPage.style.display = 'none';
    document.getElementById('loginForm').reset();
}

// --- ADMIN DASHBOARD LOGIC ---

async function loadAdminDashboard() {
    adminPage.style.display = 'block';
    await fetchUsers();
    updateDashboardStats();
}

async function fetchUsers() {
    const { data: users, error } = await sb
        .from('profiles')
        .select('*')
        .neq('role', 'admin') 
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    allUsers = users; // Save to global variable
    renderUserTable();
}

function renderUserTable(usersToRender = null) {
    const list = usersToRender || allUsers;
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    
    // Stats Update
    document.getElementById('totalUsers').textContent = allUsers.length;

    // Pagination Logic
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = list.slice(start, end);

    const pageIndicator = document.getElementById('pageIndicator');
    if(pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;

    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

    paginatedItems.forEach(user => {
        // --- MISSING LINES ADDED HERE ---
        // We must define these variables before using them in the HTML below
        const daily = Number(user.daily_amount) || 0;
        const balance = Number(user.balance) || 0;
        // --------------------------------

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.member_id || '-'}</td> 
            <td>${user.full_name}</td>
            <td>${user.username}</td>
            <td>${user.email || '-'}</td>
            <td>₦${daily.toLocaleString()}</td>   <td>₦${balance.toLocaleString()}</td> <td>-</td>
            <td><span class="status-active"><i class="fas fa-circle"></i> Active</span></td>
            <td>
                <button class="btn-action btn-edit" title="Manage Deposits" onclick="openDepositManager('${user.id}', '${user.full_name}', ${daily})">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="btn-action btn-delete" title="Manage Withdrawals" onclick="openWithdrawalManager('${user.id}', '${user.full_name}', ${balance})">
                    <i class="fas fa-minus-circle"></i>
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

// --- EXPORT TO EXCEL/CSV (NEW) ---
function exportToCSV() {
    if (allUsers.length === 0) {
        alert("No data to export");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Full Name,Username,Email,Phone,Daily Amount,Balance\n";

    allUsers.forEach(user => {
        const row = [
            user.id,
            user.full_name,
            user.username,
            user.email,
            user.phone,
            user.daily_amount,
            user.balance
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

// --- PRINT REPORT (NEW) ---
function printReport() {
    window.print();
}

// --- GLOBAL BUTTON HELPERS ---
function focusOnTable() {
    const searchBox = document.getElementById('userSearch');
    searchBox.scrollIntoView({ behavior: 'smooth' });
    searchBox.focus();
    // Flash the search box to draw attention
    searchBox.style.borderColor = 'var(--accent-orange)';
    setTimeout(() => {
        searchBox.style.borderColor = 'var(--light-gray)';
    }, 1000);
}

// --- WITHDRAWAL LOGIC (NEW) ---
async function openWithdrawalManager(userId, userName, currentBalance) {
    selectedUserId = userId;
    
    document.getElementById('withdrawalUserName').textContent = userName;
    document.getElementById('withdrawalUserAmount').textContent = `Current Balance: ₦${currentBalance.toLocaleString()}`;
    
    // Clear previous input
    document.getElementById('withdrawalAmountInput').value = '';

    // Populate SESSION Selector
    const yearSelect = document.getElementById('withdrawalYearSelect');
    yearSelect.innerHTML = '';
    
    // CONFIGURATION: 2025 is Session 1
    const baseYear = 2025; 
    
    // Generate 10 Sessions (Session 1 to Session 10)
    for(let i = 0; i < 10; i++) {
        const loopYear = baseYear + i;
        const opt = document.createElement('option');
        opt.value = loopYear; // Value sent to DB is still the real year (e.g. 2025)
        opt.textContent = `Session ${i + 1}`; // Display is "Session 1", "Session 2"
        
        // Auto-select the current year
        if(loopYear === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // Render history for the selected session
    renderWithdrawalCalendar(currentYear, userId);
    
    // Update when session changes
    yearSelect.onchange = (e) => renderWithdrawalCalendar(parseInt(e.target.value), userId);

    openModal('withdrawalModal');
}

async function renderWithdrawalCalendar(year, userId) {
    const container = document.getElementById('withdrawalMonthsContainer');
    container.innerHTML = 'Loading withdrawal history...';

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    const { data: transactions } = await sb
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'withdrawal')
        .gte('transaction_date', start)
        .lte('transaction_date', end);

    const withdrawnDates = new Set(transactions.map(t => t.transaction_date));
    container.innerHTML = '';
    let yearlyWithdrawn = 0;
    
    // Simple list view for withdrawals (different from deposit calendar)
    if(transactions.length === 0) {
        container.innerHTML = '<p style="padding:10px; text-align:center;">No withdrawals found for this year.</p>';
    } else {
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        
        transactions.forEach(t => {
            yearlyWithdrawn += t.amount;
            const item = document.createElement('li');
            item.className = 'summary-item';
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
    
    document.getElementById('withdrawalYearlyTotal').textContent = `₦${yearlyWithdrawn.toLocaleString()}`;
}

async function saveWithdrawalChanges() {
    // Get Amount from the NEW Input Field
    const amountInput = document.getElementById('withdrawalAmountInput');
    const amountVal = amountInput.value.trim();
    
    if(!amountVal || amountVal <= 0) {
        alert("Please enter a valid amount to withdraw.");
        return;
    }
    
    const amount = parseFloat(amountVal);
    
    // Check Balance
    const { data: user } = await sb.from('profiles').select('balance').eq('id', selectedUserId).single();
    const currentBal = Number(user.balance) || 0;
    
    if(currentBal < amount) {
        alert(`Insufficient funds! User only has ₦${currentBal.toLocaleString()}`);
        return;
    }

    const btn = document.getElementById('confirmWithdrawalModal');
    btn.textContent = 'Processing...';

    // Insert Transaction (Date is today)
    const today = new Date().toISOString().split('T')[0];
    const { error } = await sb.from('transactions').insert([{
        user_id: selectedUserId,
        type: 'withdrawal',
        amount: amount,
        transaction_date: today,
        description: 'Manual Withdrawal' 
    }]);

    if (error) {
        alert("Error: " + error.message);
        btn.textContent = 'Confirm Withdrawal';
        return;
    }

    // Update Balance
    await sb.from('profiles').update({ balance: currentBal - amount }).eq('id', selectedUserId);

    alert("Withdrawal successful!");
    closeModal('withdrawalModal');
    btn.textContent = 'Confirm Withdrawal';
    
    // Refresh Data
    loadAdminDashboard();
}

// --- DEPOSIT LOGIC (Existing + Refined) ---
async function openDepositManager(userId, userName, dailyAmount) {
    selectedUserId = userId;
    
    document.getElementById('depositUserName').textContent = userName;
    document.getElementById('depositUserAmount').textContent = `Daily Amount: ₦${dailyAmount.toLocaleString()}`;
    
    // Populate SESSION Selector
    const yearSelect = document.getElementById('depositYearSelect');
    yearSelect.innerHTML = '';
    
    // CONFIGURATION: 2025 is Session 1
    const baseYear = 2025; 

    // Generate 10 Sessions (Session 1 to Session 10)
    for(let i = 0; i < 10; i++) {
        const loopYear = baseYear + i;
        const opt = document.createElement('option');
        opt.value = loopYear; // Value sent to DB is the real year
        opt.textContent = `Session ${i + 1}`; // Display is "Session X"
        
        // Auto-select the current year
        if(loopYear === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    renderDepositCalendar(currentYear, userId);
    openModal('depositModal');
    
    yearSelect.onchange = (e) => renderDepositCalendar(parseInt(e.target.value), userId);
}

async function renderDepositCalendar(startYear, userId) {
    const container = document.getElementById('depositMonthsContainer');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Loading 24-month cycle...</p>';

    // Calculate Date Range (Covering a wide range to ensure we catch all saved dates)
    const startDate = `${startYear}-01-01`;
    const endDate = `${startYear + 2}-02-01`; // Extra buffer
    
    const { data: transactions } = await sb
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

    const depositedDates = new Set(transactions.map(t => t.transaction_date));

    container.innerHTML = '';
    let cycleTotal = 0;
    
    // Generate exactly 24 "Months"
    for (let m = 0; m < 24; m++) {
        // Calculate the "Real" year/month for this slot
        const currentLoopYear = startYear + Math.floor(m / 12); 
        const currentLoopMonth = m % 12; // 0=Jan, 1=Feb...

        const monthSection = document.createElement('div');
        monthSection.className = 'month-section';
        
        let daysHTML = '';
        let monthCount = 0;

        // FORCE GENERATE 1-31 DAYS
        for (let day = 1; day <= 31; day++) {
            // 1. Create a "Safe" Date Object
            // If we ask for Feb 30, JS automatically rolls it to Mar 2. We use this feature.
            const dateObj = new Date(currentLoopYear, currentLoopMonth, day);
            
            // Format to YYYY-MM-DD string for Database
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${d}`;
            
            // Check if this date is already saved in DB
            const isDeposited = depositedDates.has(dateStr);
            if(isDeposited) monthCount++;

            daysHTML += `
                <div class="checkbox-day ${isDeposited ? 'deposited' : ''}">
                    <label>${day}</label>
                    <input type="checkbox" 
                           class="deposit-checkbox" 
                           data-date="${dateStr}" 
                           ${isDeposited ? 'checked' : ''}>
                </div>
            `;
        }
        
        cycleTotal += (monthCount * getDailyAmount()); 

        monthSection.innerHTML = `
            <div class="month-header">
                <h4>Month ${m + 1}</h4>
                <div class="month-summary"><span>${monthCount} Checked</span></div>
            </div>
            <div class="checkbox-grid">
                ${daysHTML}
            </div>
        `;
        container.appendChild(monthSection);
    }
    
    document.getElementById('depositYearlyTotal').textContent = `₦${cycleTotal.toLocaleString()}`;
}

function getDailyAmount() {
    const text = document.getElementById('depositUserAmount').textContent;
    return parseInt(text.replace(/[^0-9]/g, ''));
}

async function saveDepositChanges() {
    const checkboxes = document.querySelectorAll('.deposit-checkbox');
    const amount = getDailyAmount();
    const btn = document.getElementById('confirmDepositModal');
    
    btn.textContent = 'Saving...';
    
    // Define the full range we are looking at
    const startYear = parseInt(document.getElementById('depositYearSelect').value);
    const startDate = `${startYear}-01-01`;
    const endDate = `${startYear + 2}-02-01`; // Buffer to catch roll-over dates

    // 1. Fetch Existing (to avoid duplicates)
    const { data: existingTx } = await sb
        .from('transactions')
        .select('transaction_date, id')
        .eq('user_id', selectedUserId)
        .eq('type', 'deposit')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

    const existingMap = new Map(existingTx.map(t => [t.transaction_date, t.id]));
    const toInsert = [];
    const toDeleteIds = [];
    const processedDates = new Set(); // Prevent duplicates in the same batch save

    // 2. Process Checkboxes
    checkboxes.forEach(box => {
        const date = box.dataset.date;
        
        // Skip if we already processed this date in this loop 
        // (This happens because Feb 30 rolls to Mar 2, and Mar 2 exists too)
        if (processedDates.has(date)) return;
        
        const isChecked = box.checked;
        const hasRecord = existingMap.has(date);

        if (isChecked && !hasRecord) {
            toInsert.push({ 
                user_id: selectedUserId, 
                type: 'deposit', 
                amount: amount, 
                transaction_date: date, 
                description: 'Daily Contribution' 
            });
            processedDates.add(date);
        } else if (!isChecked && hasRecord) {
            toDeleteIds.push(existingMap.get(date));
            processedDates.add(date);
        }
    });

    // 3. Database Operations
    if (toDeleteIds.length > 0) await sb.from('transactions').delete().in('id', toDeleteIds);
    if (toInsert.length > 0) await sb.from('transactions').insert(toInsert);

    // 4. Update Balance
    const balanceChange = (toInsert.length * amount) - (toDeleteIds.length * amount);
    const { data: user } = await sb.from('profiles').select('balance').eq('id', selectedUserId).single();
    await sb.from('profiles').update({ balance: (Number(user.balance) || 0) + balanceChange }).eq('id', selectedUserId);

    btn.textContent = 'Confirm Deposits';
    closeModal('depositModal');
    alert('Deposits updated successfully!');
    loadAdminDashboard();
}

async function handleRegisterUser(e) {
    e.preventDefault();
    
    // Get the Manual Member ID
    const memberId = document.getElementById('newMemberId').value.trim();
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const pin = document.getElementById('newPin').value.trim();
    const phone = document.getElementById('newPhone').value.trim();
    const amount = document.getElementById('dailyProposedAmount').value;

    if (pin.length < 4 || isNaN(pin)) {
        alert("Please enter a valid 4-digit PIN.");
        return;
    }

    const newUser = {
        member_id: memberId, // Save the manual ID here
        username: username,
        password: pin,
        phone: phone,
        daily_amount: amount,
        full_name: username, 
        email: "",
        role: 'user',
        balance: 0
    };

    const { error } = await sb.from('profiles').insert([newUser]);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert(`User registered! ID: ${memberId}`);
        closeModal('userModal');
        document.getElementById('addUserForm').reset();
        fetchUsers();
    }
}

async function updateDashboardStats() {
    const { data: profiles } = await sb.from('profiles').select('balance');
    const total = profiles.reduce((acc, curr) => acc + (curr.balance || 0), 0);
    document.getElementById('totalBalance').textContent = `₦${total.toLocaleString()}`;
}

// --- UTILITIES ---
function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }
function updateDateDisplay() {
    const dateEl = document.getElementById('todayDate');
    if(dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function filterUsers(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allUsers.filter(user => 
        user.full_name.toLowerCase().includes(lowerQuery) || 
        user.username.toLowerCase().includes(lowerQuery)
    );
    renderUserTable(filtered);
}

// ==========================================
// 9. USER DASHBOARD LOGIC (Safe Version)
// ==========================================
// ==========================================
// 9. USER DASHBOARD LOGIC (Safe Version)
// ==========================================
async function loadUserDashboard() {
    try {
        // 1. Show User Page
        userPage.style.display = 'block';

        // 2. Safe Data Extraction
        const fullName = currentUser.full_name || 'Member';
        const balance = Number(currentUser.balance) || 0;
        const daily = Number(currentUser.daily_amount) || 0;
        const memberId = currentUser.member_id || '---';

        // 3. Update Sidebar & Header Info
        document.getElementById('currentUserName').textContent = fullName;
        document.getElementById('displayUserName').textContent = fullName;
        
        // Update Member ID in Sidebar (Find the element with class .user-id)
        const idElement = document.querySelector('.user-id');
        if(idElement) idElement.textContent = `Member ID: ${memberId}`;

        // 4. Update Balance Cards
        document.getElementById('currentBalance').textContent = `₦${balance.toLocaleString()}`;
        document.getElementById('dailyTargetAmount').textContent = `₦${daily.toLocaleString()}`;

        // 5. Fetch & Display Transactions
        const { data: transactions } = await sb
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('transaction_date', { ascending: false })
            .limit(30);

        const tbody = document.getElementById('transactionTableBody');
        tbody.innerHTML = '';
        let totalDeposits = 0;

        if (transactions && transactions.length > 0) {
            transactions.forEach(tx => {
                if(tx.type === 'deposit') totalDeposits += Number(tx.amount);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${tx.id.slice(0, 8)}</td>
                    <td>${tx.description || tx.type}</td>
                    <td>₦${Number(tx.amount).toLocaleString()}</td>
                    <td><span class="${tx.type === 'deposit' ? 'type-deposit' : 'type-withdrawal'}">${tx.type}</span></td>
                    <td>-</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No recent transactions.</td></tr>';
        }

        // 6. Update Summary Stats
        document.getElementById('totalDeposits30Days').textContent = `₦${totalDeposits.toLocaleString()}`;

    } catch (err) {
        console.error("Dashboard Error:", err);
        alert("Error loading dashboard data. Please verify your internet connection.");
        // Ensure page is visible even if data fails
        userPage.style.display = 'block';
    }
}