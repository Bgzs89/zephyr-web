import os
import json
import csv
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__, 
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'static'),
    static_url_path='/static',
    template_folder=os.path.join(os.path.dirname(__file__), '..', 'templates')
)
app.secret_key = os.environ.get('SECRET_KEY', 'zephyr-secret-dev')

# Data file - use /tmp for Vercel (ephemeral) or persistent volume
DATA_FILE = Path('/tmp/zephyr_savings.json') if os.environ.get('VERCEL') else Path.home() / '.savings_tracker.json'
BACKUP_DIR = Path('/tmp/zephyr_backups') if os.environ.get('VERCEL') else Path.home() / '.savings_backups'

# Ensure data file exists
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class Transaction:
    id: int
    type: str
    amount: float
    category: str
    description: str
    date: str

@dataclass
class Recurring:
    id: int
    type: str
    amount: float
    category: str
    description: str
    frequency: str
    day_of_month: int = 1
    day_of_week: int = 0
    next_date: str = ""
    active: bool = True

@dataclass
class Budget:
    weekly: float = 0
    monthly: float = 0
    alerts: bool = True

@dataclass
class Goal:
    id: int
    name: str
    target: float
    current: float = 0
    created: str = ""
    deadline: str = ""

@dataclass
class AppData:
    transactions: List[Transaction] = field(default_factory=list)
    recurring: List[Recurring] = field(default_factory=list)
    budget: Budget = field(default_factory=Budget)
    goals: List[Goal] = field(default_factory=list)
    next_id: int = 1
    next_recurring_id: int = 1
    next_goal_id: int = 1


class Tracker:
    def __init__(self):
        self.data = AppData()
        self.load()
        self.process_recurring()

    def load(self):
        if DATA_FILE.exists():
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    d = json.load(f)
                    self.data.transactions = [Transaction(**t) for t in d.get('transactions', [])]
                    self.data.recurring = [Recurring(**r) for r in d.get('recurring', [])]
                    self.data.budget = Budget(**d.get('budget', {}))
                    self.data.goals = [Goal(**g) for g in d.get('goals', [])]
                    self.data.next_id = d.get('next_id', 1)
                    self.data.next_recurring_id = d.get('next_recurring_id', 1)
                    self.data.next_goal_id = d.get('next_goal_id', 1)
            except Exception:
                pass

    def save(self):
        d = {
            'transactions': [asdict(t) for t in self.data.transactions],
            'recurring': [asdict(r) for r in self.data.recurring],
            'budget': asdict(self.data.budget),
            'goals': [asdict(g) for g in self.data.goals],
            'next_id': self.data.next_id,
            'next_recurring_id': self.data.next_recurring_id,
            'next_goal_id': self.data.next_goal_id,
        }
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)

    def fmt(self, amount: float) -> str:
        return f"Rp {amount:,.0f}".replace(',', '.')

    def get_balance(self) -> float:
        inc = sum(t.amount for t in self.data.transactions if t.type == 'income')
        exp = sum(t.amount for t in self.data.transactions if t.type == 'expense')
        return inc - exp

    def get_week_range(self) -> tuple:
        today = datetime.now()
        mon = today - timedelta(days=today.weekday())
        return mon.date(), (mon + timedelta(days=6)).date()

    def get_month_range(self) -> tuple:
        today = datetime.now()
        first = today.replace(day=1)
        if today.month == 12:
            last = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            last = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return first.date(), last.date()

    def get_week_stats(self) -> tuple:
        mon, sun = self.get_week_range()
        a, b = mon.isoformat(), sun.isoformat()
        inc = sum(t.amount for t in self.data.transactions if t.type == 'income' and a <= t.date[:10] <= b)
        exp = sum(t.amount for t in self.data.transactions if t.type == 'expense' and a <= t.date[:10] <= b)
        return inc, exp, inc - exp

    def get_month_stats(self) -> tuple:
        first, last = self.get_month_range()
        a, b = first.isoformat(), last.isoformat()
        inc = sum(t.amount for t in self.data.transactions if t.type == 'income' and a <= t.date[:10] <= b)
        exp = sum(t.amount for t in self.data.transactions if t.type == 'expense' and a <= t.date[:10] <= b)
        return inc, exp, inc - exp

    def add_transaction(self, tx_type: str, amount: float, category: str, description: str):
        t = Transaction(self.data.next_id, tx_type, amount, category, description, datetime.now().isoformat())
        self.data.next_id += 1
        self.data.transactions.append(t)
        self.save()
        return {'id': t.id, 'message': f'{tx_type} added'}

    def delete_transaction(self, tid: int):
        self.data.transactions = [t for t in self.data.transactions if t.id != tid]
        self.save()

    def edit_transaction(self, tid: int, amount: float = None, category: str = None, description: str = None):
        t = next((x for x in self.data.transactions if x.id == tid), None)
        if not t:
            return False
        if amount is not None:
            t.amount = amount
        if category is not None:
            t.category = category
        if description is not None:
            t.description = description
        self.save()
        return True

    def set_budget(self, weekly: float = None, monthly: float = None):
        if weekly is not None:
            self.data.budget.weekly = weekly
        if monthly is not None:
            self.data.budget.monthly = monthly
        self.save()

    def add_goal(self, name: str, target: float, deadline: str = ''):
        g = Goal(self.data.next_goal_id, name, target, 0, datetime.now().isoformat(), deadline)
        self.data.next_goal_id += 1
        self.data.goals.append(g)
        self.save()
        return {'id': g.id}

    def delete_goal(self, gid: int):
        self.data.goals = [g for g in self.data.goals if g.id != gid]
        self.save()

    def update_goals(self):
        for g in self.data.goals:
            g.current = sum(t.amount for t in self.data.transactions if t.type == 'income' and t.category == g.name)
        self.save()

    def add_recurring(self, tx_type: str, amount: float, category: str, description: str, frequency: str, day: int = None):
        r = Recurring(self.data.next_recurring_id, tx_type, amount, category, description, frequency)
        if frequency == 'monthly':
            r.day_of_month = day or 1
        elif frequency == 'weekly':
            r.day_of_week = day or 0
        r.next_date = self.calc_next(r)
        self.data.next_recurring_id += 1
        self.data.recurring.append(r)
        self.save()
        return {'id': r.id}

    def calc_next(self, r: Recurring) -> str:
        today = datetime.now().date()
        if r.frequency == 'daily':
            return (today + timedelta(days=1)).isoformat()
        if r.frequency == 'weekly':
            d = (r.day_of_week - today.weekday()) % 7 or 7
            return (today + timedelta(days=d)).isoformat()
        if r.frequency == 'monthly':
            nxt = today.replace(day=1) + timedelta(days=32)
            return nxt.replace(day=min(r.day_of_month, 28)).isoformat()
        return today.isoformat()

    def process_recurring(self):
        today = datetime.now().date().isoformat()
        for r in self.data.recurring:
            if not r.active:
                continue
            while r.next_date <= today:
                t = Transaction(self.data.next_id, r.type, r.amount, r.category, f'[Rutin] {r.description}', datetime.now().isoformat())
                self.data.next_id += 1
                self.data.transactions.append(t)
                r.next_date = self.calc_next(r)
        self.save()

    def get_summary(self) -> Dict:
        bal = self.get_balance()
        inc = sum(t.amount for t in self.data.transactions if t.type == 'income')
        exp = sum(t.amount for t in self.data.transactions if t.type == 'expense')
        return {'balance': bal, 'income': inc, 'expense': exp, 'fmt_balance': self.fmt(bal), 'fmt_income': self.fmt(inc), 'fmt_expense': self.fmt(exp)}

    def get_weekly(self) -> Dict:
        inc, exp, net = self.get_week_stats()
        mon, sun = self.get_week_range()
        today = datetime.now()
        day = today.weekday()
        days_left = 6 - day
        avg = exp / max(day + 1, 1)
        est = net - avg * days_left
        b = self.data.budget.weekly
        buse = exp / b * 100 if b else 0
        return {
            'period': f'{mon.strftime("%d/%m")} - {sun.strftime("%d/%m/%Y")}',
            'income': inc, 'expense': exp, 'net': net,
            'fmt_income': self.fmt(inc), 'fmt_expense': self.fmt(exp), 'fmt_net': self.fmt(net),
            'budget': b, 'budget_used': buse, 'fmt_budget': self.fmt(b),
            'day': day + 1, 'days_left': days_left,
            'avg_daily': self.fmt(avg), 'est_end': self.fmt(est)
        }

    def get_monthly(self) -> Dict:
        inc, exp, net = self.get_month_stats()
        first, last = self.get_month_range()
        today = datetime.now()
        dim = (last - first).days + 1
        avg = exp / max(today.day, 1)
        est = net - avg * (dim - today.day)
        b = self.data.budget.monthly
        buse = exp / b * 100 if b else 0
        return {
            'period': first.strftime('%B %Y'),
            'income': inc, 'expense': exp, 'net': net,
            'fmt_income': self.fmt(inc), 'fmt_expense': self.fmt(exp), 'fmt_net': self.fmt(net),
            'budget': b, 'budget_used': buse, 'fmt_budget': self.fmt(b),
            'day': today.day, 'days_in_month': dim,
            'avg_daily': self.fmt(avg), 'est_end': self.fmt(est)
        }

    def get_transactions(self, limit=20, tx_type=None, category=None, date=None) -> List[Dict]:
        txns = self.data.transactions
        if tx_type:
            txns = [t for t in txns if t.type == tx_type]
        if category:
            txns = [t for t in txns if t.category.lower() == category.lower()]
        if date:
            txns = [t for t in txns if t.date[:10] == date]
        txns = sorted(txns, key=lambda x: x.date, reverse=True)[:limit]
        return [{
            'id': t.id,
            'date': datetime.fromisoformat(t.date).strftime('%d/%m/%Y'),
            'type': t.type,
            'type_label': 'MASUK' if t.type == 'income' else 'KELUAR',
            'category': t.category,
            'amount': t.amount,
            'fmt_amount': f"{'+' if t.type == 'income' else '-'}{self.fmt(t.amount)}",
            'description': t.description
        } for t in txns]

    def get_categories(self) -> Dict:
        inc_c, exp_c = {}, {}
        for t in self.data.transactions:
            d = inc_c if t.type == 'income' else exp_c
            d[t.category] = d.get(t.category, 0) + t.amount
        return {
            'income': [{'category': k, 'amount': v, 'fmt': self.fmt(v), 'pct': v/sum(inc_c.values())*100 if inc_c else 0} for k, v in sorted(inc_c.items(), key=lambda x: -x[1])],
            'expense': [{'category': k, 'amount': v, 'fmt': self.fmt(v), 'pct': v/sum(exp_c.values())*100 if exp_c else 0} for k, v in sorted(exp_c.items(), key=lambda x: -x[1])]
        }

    def get_goals(self) -> List[Dict]:
        self.update_goals()
        return [{
            'id': g.id,
            'name': g.name,
            'target': g.target,
            'current': g.current,
            'fmt_target': self.fmt(g.target),
            'fmt_current': self.fmt(g.current),
            'fmt_remaining': self.fmt(max(0, g.target - g.current)),
            'pct': g.current / g.target * 100 if g.target else 0,
            'deadline': g.deadline
        } for g in self.data.goals]

    def get_safe_money(self) -> Dict:
        bal = self.get_balance()
        bills = sum(r.amount for r in self.data.recurring if r.active and r.type == 'expense' and r.frequency == 'monthly')
        wleft = self.data.budget.weekly - self.get_week_stats()[1]
        mleft = self.data.budget.monthly - self.get_month_stats()[1]
        safe = bal - max(0, bills) - max(0, -wleft) - max(0, -mleft)
        return {
            'balance': self.fmt(bal),
            'bills': self.fmt(bills),
            'wleft': self.fmt(max(0, wleft)),
            'mleft': self.fmt(max(0, mleft)),
            'safe': self.fmt(safe),
            'safe_raw': safe
        }

    def get_charts(self) -> Dict:
        weeks, wi, we = [], [], []
        for i in range(7, -1, -1):
            mon = datetime.now() - timedelta(weeks=i, days=datetime.now().weekday())
            sun = mon + timedelta(days=6)
            a, b = mon.date().isoformat(), sun.date().isoformat()
            wi.append(sum(t.amount for t in self.data.transactions if t.type == 'income' and a <= t.date[:10] <= b))
            we.append(sum(t.amount for t in self.data.transactions if t.type == 'expense' and a <= t.date[:10] <= b))
            weeks.append(mon.strftime('%d/%m'))

        months, mi, me = [], [], []
        for i in range(5, -1, -1):
            d = datetime.now().replace(day=1) - timedelta(days=i * 30)
            d = d.replace(day=1)
            first = d.date()
            last = (d.replace(year=d.year + 1, month=1, day=1) - timedelta(days=1)) if d.month == 12 else (d.replace(month=d.month + 1, day=1) - timedelta(days=1))
            a, b = first.isoformat(), last.date().isoformat()
            mi.append(sum(t.amount for t in self.data.transactions if t.type == 'income' and a <= t.date[:10] <= b))
            me.append(sum(t.amount for t in self.data.transactions if t.type == 'expense' and a <= t.date[:10] <= b))
            months.append(d.strftime('%m/%Y'))

        return {
            'weekly': {'labels': weeks, 'income': wi, 'expense': we},
            'monthly': {'labels': months, 'income': mi, 'expense': me}
        }

    def get_recurring(self) -> List[Dict]:
        return [{
            'id': r.id,
            'type': r.type,
            'type_label': 'MASUK' if r.type == 'income' else 'KELUAR',
            'amount': r.amount,
            'fmt_amount': self.fmt(r.amount),
            'category': r.category,
            'frequency': r.frequency,
            'next_date': r.next_date[:10],
            'active': r.active,
            'description': r.description
        } for r in self.data.recurring]

    def export_csv(self) -> str:
        export_dir = Path('/tmp/zephyr_exports') if os.environ.get('VERCEL') else Path.home() / '.savings_exports'
        export_dir.mkdir(parents=True, exist_ok=True)
        filepath = export_dir / f'zephyr_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['ID', 'Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Deskripsi'])
            for t in sorted(self.data.transactions, key=lambda x: x.date):
                w.writerow([t.id, datetime.fromisoformat(t.date).strftime('%d/%m/%Y'), t.type, t.category, t.amount, t.description])
        return str(filepath)

    def backup(self) -> str:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        dst = BACKUP_DIR / f'zephyr_backup_{ts}.json'
        if DATA_FILE.exists():
            shutil.copy2(DATA_FILE, dst)
        for old in sorted(BACKUP_DIR.glob('zephyr_backup_*.json'))[:-10]:
            old.unlink()
        return str(dst)

    def import_csv(self, filepath: str) -> dict:
        imported = 0
        errors = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    tx_type = row.get('Jenis', '').strip().lower()
                    if tx_type not in ('income', 'expense', 'masuk', 'keluar'):
                        errors.append(f"Baris {row_num}: Jenis harus 'income/masuk' atau 'expense/keluar'")
                        continue
                    tx_type = 'income' if tx_type in ('income', 'masuk') else 'expense'
                    amount = float(row.get('Jumlah', 0))
                    if amount <= 0:
                        errors.append(f"Baris {row_num}: Jumlah harus > 0")
                        continue
                    category = row.get('Kategori', '').strip() or 'Lainnya'
                    description = row.get('Deskripsi', '').strip()
                    date_str = row.get('Tanggal', '').strip()
                    date = datetime.now().isoformat()
                    if date_str:
                        try:
                            date = datetime.strptime(date_str, '%d/%m/%Y').isoformat()
                        except ValueError:
                            errors.append(f"Baris {row_num}: Format tanggal salah (gunakan DD/MM/YYYY)")
                            continue
                    self.add_transaction(tx_type, amount, category, description)
                    self.data.transactions[-1].date = date
                    imported += 1
                except ValueError as e:
                    errors.append(f"Baris {row_num}: {str(e)}")
                except Exception as e:
                    errors.append(f"Baris {row_num}: {str(e)}")
        self.save()
        return {'imported': imported, 'errors': errors}


tracker = Tracker()


# API Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/summary')
def api_summary():
    return jsonify(tracker.get_summary())

@app.route('/api/weekly')
def api_weekly():
    return jsonify(tracker.get_weekly())

@app.route('/api/monthly')
def api_monthly():
    return jsonify(tracker.get_monthly())

@app.route('/api/transactions')
def api_transactions():
    return jsonify(tracker.get_transactions(
        limit=request.args.get('limit', 20, type=int),
        tx_type=request.args.get('type'),
        category=request.args.get('category'),
        date=request.args.get('date')
    ))

@app.route('/api/categories')
def api_categories():
    return jsonify(tracker.get_categories())

@app.route('/api/goals')
def api_goals():
    return jsonify(tracker.get_goals())

@app.route('/api/safe')
def api_safe():
    return jsonify(tracker.get_safe_money())

@app.route('/api/charts')
def api_charts():
    return jsonify(tracker.get_charts())

@app.route('/api/recurring')
def api_recurring():
    return jsonify(tracker.get_recurring())

@app.route('/api/transaction', methods=['POST'])
def api_add_transaction():
    data = request.json
    if not data or not all(k in data for k in ['type', 'amount', 'category']):
        return jsonify({'error': 'Missing required fields'}), 400
    if data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Invalid type'}), 400
    try:
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400
    result = tracker.add_transaction(data['type'], amount, data['category'], data.get('description', ''))
    return jsonify(result)

@app.route('/api/transaction/<int:tid>', methods=['DELETE'])
def api_delete_transaction(tid):
    tracker.delete_transaction(tid)
    return jsonify({'ok': True})

@app.route('/api/recurring/<int:rid>', methods=['DELETE'])
def api_delete_recurring(rid):
    # Find and deactivate recurring transaction
    for r in tracker.data.recurring:
        if r.id == rid:
            r.active = False
            tracker.save()
            return jsonify({'ok': True})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/transaction/<int:tid>', methods=['PUT'])
def api_edit_transaction(tid):
    data = request.json
    ok = tracker.edit_transaction(tid, data.get('amount'), data.get('category'), data.get('description'))
    return jsonify({'ok': ok})

@app.route('/api/budget', methods=['POST'])
def api_set_budget():
    data = request.json
    if not data:
        return jsonify({'error': 'Missing data'}), 400
    try:
        weekly = float(data.get('weekly')) if data.get('weekly') else None
        monthly = float(data.get('monthly')) if data.get('monthly') else None
        if (weekly and weekly < 0) or (monthly and monthly < 0):
            return jsonify({'error': 'Budget must be non-negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid budget'}), 400
    tracker.set_budget(weekly, monthly)
    return jsonify({'ok': True})

@app.route('/api/goal', methods=['POST'])
def api_add_goal():
    data = request.json
    if not data or not all(k in data for k in ['name', 'target']):
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        target = float(data['target'])
        if target <= 0:
            return jsonify({'error': 'Target must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid target'}), 400
    result = tracker.add_goal(data['name'], target, data.get('deadline', ''))
    return jsonify(result)

@app.route('/api/goal/<int:gid>', methods=['DELETE'])
def api_delete_goal(gid):
    tracker.delete_goal(gid)
    return jsonify({'ok': True})

@app.route('/api/recurring', methods=['POST'])
def api_add_recurring():
    data = request.json
    if not data or not all(k in data for k in ['type', 'amount', 'category', 'description', 'frequency']):
        return jsonify({'error': 'Missing required fields'}), 400
    if data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Invalid type'}), 400
    if data['frequency'] not in ['daily', 'weekly', 'monthly']:
        return jsonify({'error': 'Invalid frequency'}), 400
    try:
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid amount'}), 400
    result = tracker.add_recurring(data['type'], amount, data['category'], data['description'], data['frequency'], data.get('day'))
    return jsonify(result)

@app.route('/api/export')
def api_export():
    filepath = tracker.export_csv()
    return send_from_directory(os.path.dirname(filepath), os.path.basename(filepath), as_attachment=True)

@app.route('/api/backup')
def api_backup():
    path = tracker.backup()
    return jsonify({'path': path})

@app.route('/api/import', methods=['POST'])
def api_import():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV'}), 400
    
    import_dir = Path('/tmp/zephyr_imports') if os.environ.get('VERCEL') else Path.home() / '.savings_imports'
    import_dir.mkdir(parents=True, exist_ok=True)
    filepath = import_dir / f'import_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    file.save(filepath)
    
    result = tracker.import_csv(str(filepath))
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, port=5000)