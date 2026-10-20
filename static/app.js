// Zephyr Saving Money - Frontend App
const API = '';
let currentTab = 'dashboard';
let charts = { weekly: null, monthly: null, category: null };

// Init
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupModals();
    setupForms();
    setupKeyboardShortcuts();
    setupImportButton();
    loadAll();
});

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input/textarea/select
        const tag = e.target.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

        // Cmd/Ctrl + N = New transaction
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
            e.preventDefault();
            openModal('add-transaction');
        }
        // 1-7 = Switch tabs
        if (e.key >= '1' && e.key <= '7') {
            const tabs = ['dashboard', 'transactions', 'charts', 'goals', 'budget', 'recurring', 'tools'];
            const idx = parseInt(e.key) - 1;
            if (tabs[idx]) switchTab(tabs[idx]);
        }
        // / = Focus search (if exists)
        if (e.key === '/') {
            e.preventDefault();
            const search = document.querySelector('#filter-category');
            if (search) search.focus();
        }
    });
}

// Toggle detail panels
function toggleDetails(btn) {
    const panelId = btn.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
    panel.hidden = expanded;
    btn.textContent = expanded ? 'Detail' : 'Sembunyikan';
}

// Tab switching
function setupTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`panel-${tab}`).classList.add('active');
    currentTab = tab;
    if (tab === 'charts') loadCharts();
}

// Modal handling
function setupModals() {
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(id) {
    closeModal();
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById(`modal-${id}`).classList.add('active');
    // Update categories datalist
    loadCategoriesForDatalist();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.modal form').forEach(f => f.reset());
}

function loadCategoriesForDatalist() {
    fetch(`${API}/api/categories`).then(r => r.json()).then(data => {
        const dl = document.getElementById('categories');
        dl.innerHTML = '';
        [...data.income, ...data.expense].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category;
            dl.appendChild(opt);
        });
    });
}

// Form handlers
function setupForms() {
    document.getElementById('form-transaction').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await fetch(`${API}/api/transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: fd.get('type'),
                amount: parseFloat(fd.get('amount')),
                category: fd.get('category'),
                description: fd.get('description') || ''
            })
        });
        closeModal();
        loadAll();
    });

    document.getElementById('form-goal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await fetch(`${API}/api/goal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: fd.get('name'),
                target: parseFloat(fd.get('target')),
                deadline: fd.get('deadline') || ''
            })
        });
        closeModal();
        loadAll();
    });

    document.getElementById('form-recurring').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const freq = fd.get('frequency');
        await fetch(`${API}/api/recurring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: fd.get('type'),
                amount: parseFloat(fd.get('amount')),
                category: fd.get('category'),
                description: fd.get('description'),
                frequency: freq,
                day: freq !== 'daily' ? parseInt(fd.get('day') || '1') : undefined
            })
        });
        closeModal();
        loadAll();
    });

    document.getElementById('form-budget').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await fetch(`${API}/api/budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weekly: parseFloat(fd.get('weekly') || 0) || null,
                monthly: parseFloat(fd.get('monthly') || 0) || null
            })
        });
        closeModal();
        loadAll();
    });

    document.getElementById('form-edit-transaction').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const id = fd.get('id');
        await fetch(`${API}/api/transaction/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: parseFloat(fd.get('amount')) || null,
                category: fd.get('category') || null,
                description: fd.get('description') || null
            })
        });
        closeModal();
        loadAll();
    });

    // Recurring day field toggle
    document.getElementById('recurring-frequency').addEventListener('change', (e) => {
        const field = document.getElementById('recurring-day-field');
        field.style.display = e.target.value !== 'daily' ? 'block' : 'none';
        if (e.target.value === 'weekly') {
            document.getElementById('recurring-day').max = '6';
            document.getElementById('recurring-day').placeholder = 'Hari (0=Senin..6=Minggu)';
        } else {
            document.getElementById('recurring-day').max = '28';
            document.getElementById('recurring-day').placeholder = 'Tanggal (1-28)';
        }
    });
}

// Load all data
async function loadAll() {
    await Promise.all([
        loadSummary(),
        loadWeekly(),
        loadMonthly(),
        loadSafe(),
        loadTransactions(),
        loadGoals(),
        loadRecurring(),
        loadBudgetPreview()
    ]);
    if (currentTab === 'charts') loadCharts();
}

// API helpers
async function fetchJSON(url) {
    const res = await fetch(`${API}${url}`);
    return res.json();
}

function fmt(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function fmtCompact(n) {
    if (n >= 1e9) return (n/1e9).toFixed(1) + 'M';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'jt';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'rb';
    return n.toString();
}

// Loaders
async function loadSummary() {
    const data = await fetchJSON('/api/summary');
    document.getElementById('total-balance').textContent = fmt(data.balance);
    document.getElementById('total-balance').className = 'stat-value ' + (data.balance >= 0 ? 'good' : 'bad');
}

async function loadWeekly() {
    const data = await fetchJSON('/api/weekly');
    const el = document.getElementById('weekly-net');
    el.textContent = fmt(data.net);
    el.className = 'big-number ' + (data.net >= 0 ? 'good' : 'bad');
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 600);
    
    const inc = document.getElementById('weekly-inc');
    inc.textContent = fmt(data.income);
    inc.classList.remove('placeholder');
    
    const exp = document.getElementById('weekly-exp');
    exp.textContent = fmt(data.expense);
    exp.classList.remove('placeholder');
    
    const budget = document.getElementById('weekly-budget');
    budget.textContent = fmt(data.budget);
    budget.classList.remove('placeholder');
    
    document.getElementById('weekly-used').textContent = data.budget_used.toFixed(0);
    document.getElementById('weekly-used').classList.remove('placeholder');
    document.getElementById('weekly-bar-fill').style.width = Math.min(100, data.budget_used) + '%';
    document.getElementById('weekly-bar-fill').className = 'bar-fill ' + (data.budget_used >= 100 ? 'danger' : data.budget_used >= 80 ? 'warning' : '');
    
    const day = document.getElementById('weekly-day');
    day.textContent = `ke-${data.day}/7`;
    day.classList.remove('placeholder');
    
    const avg = document.getElementById('weekly-avg');
    avg.textContent = data.avg_daily;
    avg.classList.remove('placeholder');
    
    const est = document.getElementById('weekly-est');
    est.textContent = data.est_end;
    est.className = (data.est_end >= 0 ? 'good' : 'bad');
    
    document.getElementById('weekly-budget-bar').style.display = data.budget > 0 ? 'block' : 'none';
}

async function loadMonthly() {
    const data = await fetchJSON('/api/monthly');
    const el = document.getElementById('monthly-net');
    el.textContent = fmt(data.net);
    el.className = 'big-number ' + (data.net >= 0 ? 'good' : 'bad');
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 600);
    
    const inc = document.getElementById('monthly-inc');
    inc.textContent = fmt(data.income);
    inc.classList.remove('placeholder');
    
    const exp = document.getElementById('monthly-exp');
    exp.textContent = fmt(data.expense);
    exp.classList.remove('placeholder');
    
    const budget = document.getElementById('monthly-budget');
    budget.textContent = fmt(data.budget);
    budget.classList.remove('placeholder');
    
    document.getElementById('monthly-used').textContent = data.budget_used.toFixed(0);
    document.getElementById('monthly-used').classList.remove('placeholder');
    document.getElementById('monthly-bar-fill').style.width = Math.min(100, data.budget_used) + '%';
    document.getElementById('monthly-bar-fill').className = 'bar-fill ' + (data.budget_used >= 100 ? 'danger' : data.budget_used >= 80 ? 'warning' : '');
    
    const day = document.getElementById('monthly-day');
    day.textContent = `${data.day}/${data.days_in_month}`;
    day.classList.remove('placeholder');
    
    const avg = document.getElementById('monthly-avg');
    avg.textContent = data.avg_daily;
    avg.classList.remove('placeholder');
    
    const est = document.getElementById('monthly-est');
    est.textContent = data.est_end;
    est.className = (data.est_end >= 0 ? 'good' : 'bad');
    
    document.getElementById('monthly-budget-bar').style.display = data.budget > 0 ? 'block' : 'none';
}

async function loadSafe() {
    const data = await fetchJSON('/api/safe');
    const el = document.getElementById('safe-money');
    el.textContent = data.safe;
    el.className = 'big-number safe ' + (data.safe_raw >= 0 ? 'good' : 'bad');
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 600);
    
    const balance = document.getElementById('safe-balance');
    balance.textContent = data.balance;
    balance.classList.remove('placeholder');
    
    const bills = document.getElementById('safe-bills');
    bills.textContent = '-' + data.bills;
    bills.classList.remove('placeholder');
    
    const wleft = document.getElementById('safe-wleft');
    wleft.textContent = data.wleft;
    wleft.classList.remove('placeholder');
    
    const mleft = document.getElementById('safe-mleft');
    mleft.textContent = data.mleft;
    mleft.classList.remove('placeholder');
}

async function loadTransactions() {
    const type = document.getElementById('filter-type').value || null;
    const category = document.getElementById('filter-category').value || null;
    const date = document.getElementById('filter-date').value || null;
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (category) params.set('category', category);
    if (date) params.set('date', date);
    params.set('limit', '50');
    const data = await fetchJSON(`/api/transactions?${params}`);
    const tbody = document.querySelector('#transactions-table tbody');
    tbody.innerHTML = data.map(t => `
        <tr>
            <td>${t.date}</td>
            <td><span class="type-badge ${t.type}">${t.type_label}</span></td>
            <td>${t.category}</td>
            <td class="amount ${t.type}">${t.fmt_amount}</td>
            <td>${t.description || '-'}</td>
            <td>
                <button class="btn-icon" onclick="editTransaction(${t.id}, '${t.type}', ${t.amount}, '${t.category}', '${(t.description||'').replace(/'/g, "\\'")}')" title="Edit" aria-label="Edit transaksi">✏️</button>
                <button class="btn-icon" onclick="deleteTransaction(${t.id})" title="Hapus" aria-label="Hapus transaksi">🗑️</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('tx-count').textContent = `${data.length} transaksi`;
}

function clearFilters() {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-date').value = '';
    loadTransactions();
}

async function loadCategories() {
    const data = await fetchJSON('/api/categories');
    // Already handled in datalist
}

async function loadGoals() {
    const data = await fetchJSON('/api/goals');
    const container = document.getElementById('goals-list');
    if (data.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-tertiary);">Belum ada target tabungan. Tambah target baru!</p>';
        return;
    }
    container.innerHTML = data.map(g => `
        <div class="goal-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                <h4>${g.name}</h4>
                <button class="btn-icon" onclick="deleteGoal(${g.id})" title="Hapus" aria-label="Hapus target">✕</button>
            </div>
            <div class="goal-progress">
                <div class="fill ${g.pct >= 100 ? '' : g.pct >= 80 ? 'warning' : ''}" style="width: ${Math.min(100, g.pct)}%"></div>
            </div>
            <div class="goal-stats">
                <div class="goal-stat"><span>${fmt(g.current)}</span>Tersimpan</div>
                <div class="goal-stat"><span>${fmt(g.target)}</span>Target</div>
                <div class="goal-stat"><span>${fmt(g.target - g.current)}</span>Kurang</div>
                <div class="goal-stat"><span>${g.pct.toFixed(1)}%</span>Progress</div>
            </div>
            ${g.deadline ? `<p style="font-size:0.75rem; margin-top:0.5rem; color:var(--text-tertiary);">Deadline: ${g.deadline}</p>` : ''}
        </div>
    `).join('');
}

async function deleteGoal(id) {
    if (!confirm('Hapus target ini?')) return;
    const res = await fetch(`/api/goal/${id}`, { method: 'DELETE' });
    if (res.ok) {
        loadGoals();
    } else {
        alert('Gagal menghapus target');
    }
}

async function loadRecurring() {
    const data = await fetchJSON('/api/recurring');
    const tbody = document.getElementById('recurring-table');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted); padding:2rem;">Tidak ada transaksi rutin</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(r => `
        <tr>
            <td><span class="type-badge ${r.type}">${r.type_label}</span></td>
            <td class="amount ${r.type}">${r.fmt_amount}</td>
            <td>${r.category}</td>
            <td>${r.frequency}</td>
            <td>${r.next_date}</td>
            <td><span class="${r.active ? 'good' : 'muted'}">${r.active ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>${r.description}</td>
            <td>
                <button class="btn-icon" onclick="deleteRecurring(${r.id})" title="Hapus" aria-label="Hapus transaksi rutin">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function loadBudgetPreview() {
    const [weekly, monthly] = await Promise.all([fetchJSON('/api/weekly'), fetchJSON('/api/monthly')]);
    // Weekly
    document.getElementById('budget-weekly').value = weekly.budget || '';
    document.getElementById('pv-weekly-budget').textContent = fmt(weekly.budget);
    document.getElementById('pv-weekly-used').textContent = `${fmt(weekly.expense)} (${weekly.budget_used.toFixed(0)}%)`;
    document.getElementById('pv-weekly-left').textContent = fmt(Math.max(0, weekly.budget - weekly.expense));
    document.getElementById('pv-weekly-bar').style.width = Math.min(100, weekly.budget_used) + '%';
    document.getElementById('pv-weekly-bar').className = 'bar-fill ' + (weekly.budget_used >= 100 ? 'danger' : weekly.budget_used >= 80 ? 'warning' : '');
    // Monthly
    document.getElementById('budget-monthly').value = monthly.budget || '';
    document.getElementById('pv-monthly-budget').textContent = fmt(monthly.budget);
    document.getElementById('pv-monthly-used').textContent = `${fmt(monthly.expense)} (${monthly.budget_used.toFixed(0)}%)`;
    document.getElementById('pv-monthly-left').textContent = fmt(Math.max(0, monthly.budget - monthly.expense));
    document.getElementById('pv-monthly-bar').style.width = Math.min(100, monthly.budget_used) + '%';
    document.getElementById('pv-monthly-bar').className = 'bar-fill ' + (monthly.budget_used >= 100 ? 'danger' : monthly.budget_used >= 80 ? 'warning' : '');
}

async function loadCharts() {
    const data = await fetchJSON('/api/charts');
    renderWeeklyChart(data.weekly);
    renderMonthlyChart(data.monthly);
    renderCategoryChart();
}

function renderWeeklyChart(data) {
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    if (charts.weekly) charts.weekly.destroy();
    charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Pemasukan', data: data.income, backgroundColor: 'rgba(74,222,128,0.8)', borderColor: '#4ade80', borderWidth: 1 },
                { label: 'Pengeluaran', data: data.expense, backgroundColor: 'rgba(248,113,113,0.8)', borderColor: '#f87171', borderWidth: 1 }
            ]
        },
        options: getChartOptions('Jumlah (Rp)')
    });
}

function renderMonthlyChart(data) {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    if (charts.monthly) charts.monthly.destroy();
    charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Pemasukan', data: data.income, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.1)', fill: true, tension: 0.3 },
                { label: 'Pengeluaran', data: data.expense, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', fill: true, tension: 0.3 }
            ]
        },
        options: getChartOptions('Jumlah (Rp)')
    });
}

async function renderCategoryChart() {
    const data = await fetchJSON('/api/categories');
    const exp = data.expense;
    const ctx = document.getElementById('category-chart').getContext('2d');
    if (charts.category) charts.category.destroy();
    if (exp.length === 0) {
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#5c6785';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada data pengeluaran', ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }
    const colors = [
        'rgba(248,113,113,0.8)', 'rgba(251,146,60,0.8)', 'rgba(250,204,21,0.8)',
        'rgba(74,222,128,0.8)', 'rgba(56,189,248,0.8)', 'rgba(168,85,247,0.8)',
        'rgba(244,114,182,0.8)', 'rgba(20,184,166,0.8)', 'rgba(100,116,139,0.8)', 'rgba(148,163,184,0.8)'
    ];
    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: exp.map(e => e.category),
            datasets: [{
                data: exp.map(e => e.amount),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#0b1020'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right', labels: { color: '#c8d3f5', font: { size: 12 }, padding: 16 } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.raw)} (${ctx.raw/total*100}%)` } }
            }
        }
    });
    const total = exp.reduce((a,b) => a+b.amount, 0);
}

function getChartOptions(yTitle) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#c8d3f5', font: { size: 12 }, padding: 16 } },
            tooltip: { backgroundColor: '#121a33', titleColor: '#c8d3f5', bodyColor: '#c8d3f5', borderColor: '#2b3a6b', borderWidth: 1, callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } }
        },
        scales: {
            x: { grid: { color: 'rgba(43,58,107,0.3)' }, ticks: { color: '#5c6785' } },
            y: { grid: { color: 'rgba(43,58,107,0.3)' }, ticks: { color: '#5c6785', callback: v => fmt(v) }, title: { display: true, text: yTitle, color: '#5c6785' } }
        }
    };
}

// Actions
async function saveBudget() {
    const w = parseFloat(document.getElementById('budget-weekly').value) || null;
    const m = parseFloat(document.getElementById('budget-monthly').value) || null;
    await fetch(`${API}/api/budget`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekly: w, monthly: m }) });
    loadBudgetPreview();
    loadWeekly();
    loadMonthly();
}

async function editTransaction(id, type, amount, category, description) {
    document.querySelector('#form-edit-transaction [name="id"]').value = id;
    document.querySelector('#form-edit-transaction [name="amount"]').value = amount;
    document.querySelector('#form-edit-transaction [name="category"]').value = category;
    document.querySelector('#form-edit-transaction [name="description"]').value = description;
    openModal('edit-transaction');
}

async function deleteTransaction(id) {
    if (!confirm('Yakin hapus transaksi ini?')) return;
    await fetch(`${API}/api/transaction/${id}`, { method: 'DELETE' });
    loadAll();
}

async function deleteRecurring(id) {
    if (!confirm('Yakin hapus transaksi rutin ini?')) return;
    await fetch(`${API}/api/recurring/${id}`, { method: 'DELETE' });
    loadRecurring();
}

async function exportCSV() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Mengunduh...';
    try {
        const res = await fetch(`${API}/api/export`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zephyr_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Gagal export: ' + e.message);
    }
    btn.disabled = false;
    btn.textContent = 'Download CSV';
}

async function backupData() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Membackup...';
    try {
        const data = await fetchJSON('/api/backup');
        alert('Backup tersimpan: ' + data.path);
    } catch (e) {
        alert('Gagal backup: ' + e.message);
    }
    btn.disabled = false;
    btn.textContent = 'Backup Sekarang';
}

function showImportResult(msg, isError) {
    const el = document.getElementById('import-result');
    el.style.display = 'block';
    el.className = 'muted' + (isError ? '' : ' good');
    el.textContent = msg;
}

function setupImportButton() {
    const input = document.getElementById('csv-import');
    if (!input) {
        console.error('csv-import element not found');
        return;
    }
    input.addEventListener('change', async (e) => {
        if (!e.target.files[0]) return;
        const btn = document.getElementById('csv-import-button');
        if (!btn) {
            console.error('csv-import-button not found');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Memuat...';
        try {
            const fd = new FormData();
            fd.append('file', e.target.files[0]);
            const res = await fetch(`${API}/api/import`, { method: 'POST', body: fd });
            const data = await res.json();
            const errs = data.errors || [];
            if (data.imported > 0) {
                showImportResult(`✅ Import ${data.imported} transaksi | ${errs.length} error${errs.length ? ': ' + errs[0] : ''}`);
            } else {
                showImportResult(`❌ Gagal: ${errs[0] || 'File format salah'}`);
            }
        } catch (e2) {
            console.error('Import error:', e2);
            showImportResult(`❌ Import gagal: ${e2.message}`);
        }
        btn.disabled = false;
        btn.textContent = 'Pilih File CSV';
        e.target.value = '';
        loadAll();
    });
}