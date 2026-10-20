# Zephyr Saving Money

Personal expense tracker with neo-brutalist design. Track income, expenses, recurring transactions, savings goals, budgets, and visualize spending trends.

## Features

- **Dashboard** — Weekly/monthly balance overview, safe-to-spend calculator
- **Transactions** — Add, edit, delete income & expenses with categories
- **Recurring** — Automate daily, weekly, monthly transactions
- **Goals** — Track savings targets with progress bars
- **Budgets** — Set weekly/monthly limits, view spend percentage
- **Charts** — Income vs expense trends over time
- **Categories** — Flexible categorization system
- **Local storage** — All data in JSON file (no database required)

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JS, CSS Grid, HTML5
- **Data**: Local JSON file
- **Charts**: Chart.js

## Local Setup

```bash
cd zephyr-web
python api/index.py
```

Open `http://localhost:5000` in browser.

## Project Structure

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

- `GET /api/summary` — Balance overview
- `GET /api/weekly` — Weekly stats
- `GET /api/monthly` — Monthly stats
- `POST /api/transaction` — Add transaction
- `DELETE /api/transaction/<id>` — Delete transaction
- `POST /api/goal` — Add savings goal
- `DELETE /api/goal/<id>` — Delete goal
- `POST /api/recurring` — Add recurring transaction
- `DELETE /api/recurring/<id>` — Deactivate recurring
- `POST /api/budget` — Set budget limits
- `GET /api/charts` — Chart data

## Design System

Neo-brutalism with lime green (#c0ff00) accents. Thick borders, hard offset shadows, uppercase typography. Fonts: DM Sans (UI) + Space Mono (numbers).

## License

MIT