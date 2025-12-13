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

    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

    paginatedItems.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${user.id.slice(0, 6)}</td>
            <td>${user.full_name}</td>
            <td>${user.username}</td>
            <td>${user.email || '-'}</td>
            <td>₦${user.daily_amount}</td>
            <td>₦${user.balance.toLocaleString()}</td>
            <td>-</td>
            <td><span class="status-active"><i class="fas fa-circle"></i> Active</span></td>
            <td>
                <button class="btn-action btn-edit" title="Manage Deposits" onclick="openDepositManager('${user.id}', '${user.full_name}', ${user.daily_amount})">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="btn-action btn-delete" title="Manage Withdrawals" onclick="openWithdrawalManager('${user.id}', '${user.full_name}', ${user.balance})">
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
    
    // Render calendar for visual reference (re-using deposit render logic but viewing withdrawals)
    renderWithdrawalCalendar(currentYear, userId);
    
    // Populate year
    const yearSelect = document.getElementById('withdrawalYearSelect');
    yearSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = currentYear;
    opt.textContent = currentYear;
    yearSelect.appendChild(opt);

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
    // For withdrawals, we'll create a single new transaction based on input
    // Note: You might want to add an input field for "Amount to Withdraw" in the HTML modal
    // For this example, I will prompt the user since the HTML modal in previous code was complex
    
    const amountStr = prompt("Enter amount to withdraw (₦):");
    if(!amountStr) return;
    
    const amount = parseFloat(amountStr);
    const reason = document.getElementById('withdrawalReason').value || "Withdrawal";
    
    if(isNaN(amount) || amount <= 0) {
        alert("Invalid amount");
        return;
    }

    const btn = document.getElementById('confirmWithdrawalModal');
    btn.textContent = 'Processing...';

    // 1. Check Balance
    const { data: user } = await sb.from('profiles').select('balance').eq('id', selectedUserId).single();
    
    if(user.balance < amount) {
        alert("Insufficient funds!");
        btn.textContent = 'Confirm Withdrawals';
        return;
    }

    // 2. Insert Transaction
    const today = new Date().toISOString().split('T')[0];
    
    const { error: txError } = await sb.from('transactions').insert([{
        user_id: selectedUserId,
        type: 'withdrawal',
        amount: amount,
        transaction_date: today,
        description: reason
    }]);

    if(txError) {
        alert("Error recording transaction");
        btn.textContent = 'Confirm Withdrawals';
        return;
    }

    // 3. Update Balance
    const newBalance = user.balance - amount;
    await sb.from('profiles').update({ balance: newBalance }).eq('id', selectedUserId);

    alert("Withdrawal successful!");
    closeModal('withdrawalModal');
    btn.textContent = 'Confirm Withdrawals';
    document.getElementById('withdrawalReason').value = '';
    loadAdminDashboard();
}

// --- DEPOSIT LOGIC (Existing + Refined) ---
async function openDepositManager(userId, userName, dailyAmount) {
    selectedUserId = userId;
    document.getElementById('depositUserName').textContent = userName;
    document.getElementById('depositUserAmount').textContent = `Daily Amount: ₦${dailyAmount}`;
    
    const yearSelect = document.getElementById('depositYearSelect');
    yearSelect.innerHTML = '';
    for(let i = 2024; i <= 2030; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        if(i === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    renderDepositCalendar(currentYear, userId);
    openModal('depositModal');
    yearSelect.onchange = (e) => renderDepositCalendar(parseInt(e.target.value), userId);
}

async function renderDepositCalendar(year, userId) {
    const container = document.getElementById('depositMonthsContainer');
    container.innerHTML = 'Loading...';

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    const { data: transactions } = await sb
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .gte('transaction_date', start)
        .lte('transaction_date', end);

    const depositedDates = new Set(transactions.map(t => t.transaction_date));

    container.innerHTML = '';
    let yearlyTotal = 0;
    
    for (let month = 0; month < 12; month++) {
        const monthDate = new Date(year, month, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const monthSection = document.createElement('div');
        monthSection.className = 'month-section';
        
        let daysHTML = '';
        let monthCount = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isDeposited = depositedDates.has(dateStr);
            if(isDeposited) monthCount++;

            daysHTML += `
                <div class="checkbox-day ${isDeposited ? 'deposited' : ''}">
                    <label>${day}</label>
                    <input type="checkbox" class="deposit-checkbox" data-date="${dateStr}" ${isDeposited ? 'checked' : ''}>
                </div>
            `;
        }
        
        yearlyTotal += (monthCount * getDailyAmount()); 

        monthSection.innerHTML = `
            <div class="month-header">
                <h4>${monthName}</h4>
                <div class="month-summary"><span>${monthCount}/${daysInMonth} Days</span></div>
            </div>
            <div class="checkbox-grid">${daysHTML}</div>
        `;
        container.appendChild(monthSection);
    }
    document.getElementById('depositYearlyTotal').textContent = `₦${(yearlyTotal).toLocaleString()}`;
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
    
    const year = document.getElementById('depositYearSelect').value;
    const { data: existingTx } = await sb
        .from('transactions')
        .select('transaction_date, id')
        .eq('user_id', selectedUserId)
        .eq('type', 'deposit')
        .gte('transaction_date', `${year}-01-01`)
        .lte('transaction_date', `${year}-12-31`);

    const existingMap = new Map(existingTx.map(t => [t.transaction_date, t.id]));
    const toInsert = [];
    const toDeleteIds = [];

    checkboxes.forEach(box => {
        const date = box.dataset.date;
        const isChecked = box.checked;
        const hasRecord = existingMap.has(date);

        if (isChecked && !hasRecord) {
            toInsert.push({ user_id: selectedUserId, type: 'deposit', amount: amount, transaction_date: date, description: 'Daily Contribution' });
        } else if (!isChecked && hasRecord) {
            toDeleteIds.push(existingMap.get(date));
        }
    });

    if (toDeleteIds.length > 0) await sb.from('transactions').delete().in('id', toDeleteIds);
    if (toInsert.length > 0) await sb.from('transactions').insert(toInsert);

    const balanceChange = (toInsert.length * amount) - (toDeleteIds.length * amount);
    const { data: user } = await sb.from('profiles').select('balance').eq('id', selectedUserId).single();
    await sb.from('profiles').update({ balance: (user.balance || 0) + balanceChange }).eq('id', selectedUserId);

    btn.textContent = 'Confirm Deposits';
    closeModal('depositModal');
    alert('Deposits updated!');
    loadAdminDashboard();
}

async function handleRegisterUser(e) {
    e.preventDefault();
    const newUser = {
        full_name: document.getElementById('newFullName').value,
        username: document.getElementById('newUsername').value,
        email: document.getElementById('newEmail').value,
        phone: document.getElementById('newPhone').value,
        password: document.getElementById('newPassword').value,
        daily_amount: document.getElementById('dailyProposedAmount').value,
        role: document.getElementById('userRole').value,
        balance: 0
    };
    const { error } = await sb.from('profiles').insert([newUser]);
    if (error) { alert('Error: ' + error.message); } 
    else { 
        alert('User registered!'); 
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