# Zephyr Saving Money - Web App

Terminal savings tracker dengan web interface yang bisa di-deploy ke Vercel.

## Features
- 📊 Dashboard real-time (saldo, mingguan, bulanan)
- 💰 Transaksi masuk/keluar dengan kategori
- 🎯 Target tabungan dengan progress tracker
- 📅 Budget mingguan & bulanan dengan alerts
- 🔁 Transaksi rutin otomatis (harian/mingguan/bulanan)
- 📈 Grafik & charts interaktif (Chart.js)
- 🛡️ Uang aman calculator
- 📤 Export CSV untuk Excel/Google Sheets
- 💾 Auto-backup data
- 🌪️ Dark mode theme dengan Zephyrus design

## Tech Stack
- **Backend**: Python 3.9+, Flask
- **Frontend**: Vanilla JS, Chart.js
- **Styling**: Custom CSS (dark mode)
- **Deploy**: Vercel (serverless)
- **Storage**: JSON file (local/tmp)

## Local Development

### Prerequisites
```bash
python 3.9+
pip
```

### Setup
```bash
cd zephyr-web
pip install -r requirements.txt
python api/index.py
```

Buka browser: http://localhost:5000

### Testing
```bash
# Add transaction
curl -X POST http://localhost:5000/api/transaction \
  -H "Content-Type: application/json" \
  -d '{"type":"income","amount":1000000,"category":"Gaji","description":"Bulanan"}'

# Get summary
curl http://localhost:5000/api/summary
```

## Deploy ke Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
cd zephyr-web
vercel
```

Ikuti prompts:
- **Set up and deploy?** Yes
- **Which scope?** Pilih account
- **Link to existing project?** No
- **What's your project's name?** zephyr-saving-money
- **In which directory is your code located?** ./
- **Override settings?** No

### 4. Production Deploy
```bash
vercel --prod
```

Selesai! Akses di: `https://zephyr-saving-money.vercel.app`

## Deploy Manual (GitHub + Vercel)

1. **Push ke GitHub**
```bash
cd zephyr-web
git init
git add .
git commit -m "Initial commit: Zephyr Saving Money"
git branch -M main
git remote add origin https://github.com/username/zephyr-saving-money.git
git push -u origin main
```

2. **Connect Vercel**
- Buka https://vercel.com/new
- Import repository
- Framework Preset: **Other**
- Root Directory: `./`
- Build Command: (kosongkan)
- Output Directory: (kosongkan)
- Install Command: `pip install -r requirements.txt`
- **Deploy**

3. **Done!**
Otomatis deploy setiap git push.

## Environment Variables (Opsional)

Jika mau custom:
```bash
# Vercel Dashboard > Settings > Environment Variables
SECRET_KEY=your-secret-key-here
```

## API Endpoints

### GET
- `/api/summary` - Total balance
- `/api/weekly` - Weekly stats
- `/api/monthly` - Monthly stats
- `/api/transactions?limit=20` - Transaction list
- `/api/categories` - Category breakdown
- `/api/goals` - Savings goals
- `/api/safe` - Safe money calculation
- `/api/charts` - Chart data
- `/api/recurring` - Recurring transactions
- `/api/export` - Download CSV

### POST
- `/api/transaction` - Add transaction
- `/api/goal` - Add goal
- `/api/budget` - Set budget
- `/api/recurring` - Add recurring

### PUT
- `/api/transaction/:id` - Edit transaction

### DELETE
- `/api/transaction/:id` - Delete transaction

## Struktur Project
```
zephyr-web/
├── api/
│   └── index.py          # Flask app + API routes
├── templates/
│   └── index.html        # Main HTML
├── static/
│   ├── style.css         # Dark mode styling
│   └── app.js            # Frontend logic
├── requirements.txt      # Python dependencies
├── vercel.json          # Vercel config
└── README.md            # This file
```

## Data Persistence

**Local**: `~/.savings_tracker.json`
**Vercel**: `/tmp/zephyr_savings.json` (ephemeral, reset on redeploy)

**Untuk persistent data di Vercel:**
- Gunakan database (PostgreSQL, MongoDB)
- Atau external storage (S3, Firebase)
- Atau self-host di VPS

## Limitations (Free Vercel)

- **Storage**: Ephemeral (data hilang saat redeploy)
- **Functions**: 10s timeout
- **Bandwidth**: 100GB/month
- **Invocations**: 100GB-hours/month

Untuk production, gunakan database.

## Development Tips

### Run with auto-reload
```bash
export FLASK_ENV=development
python api/index.py
```

### Debug mode
Edit `api/index.py`:
```python
app.run(debug=True, port=5000)
```

## Troubleshooting

### Data hilang setelah deploy
Data di Vercel bersifat ephemeral. Gunakan database untuk persistent storage.

### Error 500 di Vercel
Check logs: `vercel logs`

### CORS error
Sudah di-handle di Flask app.

## License
MIT

## Credits
Created with ❤️ by the winds of Zephyrus 🌪️