# Zephyr Saving Money

Personal expense tracking with neo-brutalist design. Income, expenses, recurring transactions, goals, budgets, charts.

## Features

- Dashboard: weekly/monthly balance, safe money tracker
- Transactions: add/edit/delete income & expenses by category
- Recurring: automate daily/weekly/monthly transactions
- Goals: track savings targets with progress bars
- Budget: set weekly/monthly limits, see spend percentage
- Charts: visualize income vs expense trends
- Categories: flexible categorization system
- Offline: all data stored locally in JSON

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JS, CSS Grid, HTML5
- **Data**: Local JSON file (no database required)
- **Charts**: Chart.js

## Setup Local

```bash
cd zephyr-web
python api/index.py
```

Open `http://localhost:5000` in browser.

## Deploy to Railway

1. Push repo to GitHub (done ✓)
2. Go [railway.app](https://railway.app) → Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `Bgzs89/zephyr-web`
5. Railway auto-detects Flask, deploys in ~1min
6. Get public URL (e.g., `zephyr-web.railway.app`)
7. Share URL → works on phone & laptop

## File Structure

```
zephyr-web/
├── api/
│   └── index.py          # Flask backend, data logic
├── templates/
│   └── index.html        # Main HTML
├── static/
│   ├── style.css         # Neo-brutalism styling
│   ├── app.js            # Frontend logic
│   └── money-bg.js       # Floating money animation
├── requirements.txt
├── main.py               # Entry point
└── data.json             # Local data storage
```

## API Endpoints

- `GET /api/summary` - Balance overview
- `GET /api/weekly` - Weekly stats
- `GET /api/monthly` - Monthly stats
- `POST /api/transaction` - Add transaction
- `DELETE /api/transaction/<id>` - Delete transaction
- `POST /api/goal` - Add savings goal
- `DELETE /api/goal/<id>` - Delete goal
- `POST /api/recurring` - Add recurring transaction
- `DELETE /api/recurring/<id>` - Deactivate recurring
- `POST /api/budget` - Set budget limits
- `GET /api/charts` - Chart data

## Design

Neo-brutalism with lime green (#c0ff00) accents. Thick borders, hard shadows, uppercase typography. DM Sans + Space Mono fonts.

## License

MIT
