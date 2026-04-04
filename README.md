#  Sterling Advisory

### Premium Indian Smart Loan Assistant — *Financial Guardrail*





> **"Not just a calculator. A Financial Guardrail."**

Sterling Advisory is a smart financial assistant designed to help users make **safe, data-driven loan decisions**.
It goes beyond basic EMI calculations by analyzing **financial health, risk, and future impact**.

---

##  Quick Start

###  Option 1: Frontend Only (Demo Mode)

No backend required — runs fully in browser.

```bash
# Open directly
frontend/index.html

# OR use a static server
npx serve frontend/
```

 Automatically runs in **Demo Mode** if backend is unavailable.

---

###  Option 2: Full Stack Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# Add:
# MONGO_URI=your_mongodb_connection
# JWT_SECRET=your_secret_key

# 3. Start server
npm start

# Dev mode
npm run dev
```

 Open: `http://localhost:5000`

---

##  Project Structure

```
sterling-advisory/
│
├── backend/
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── advisor.js
│   └── server.js
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── auth.js
│       ├── calculator.js
│       ├── charts.js
│       ├── insights.js
│       └── theme.js
│
├── .env.example
├── package.json
└── README.md
```

---

##  Core Features

###  Smart Financial Intelligence

*  Dashboard with KPIs (FOIR, eligibility, budget split)
*  Advanced EMI Calculator (with amortization)
*  Loan vs SIP comparison (opportunity cost)
*  Stress Testing (job loss + EMI burden)
*  Goal Planner (inflation-adjusted future planning)
*  CIBIL Score Simulator
*  Insight Cards (educational explanations)

---

##  Financial Models Used

| Formula      | Purpose                   |
| ------------ | ------------------------- |
| EMI          | Loan monthly payment      |
| FOIR         | Financial stability check |
| SIP FV       | Investment projection     |
| Inflation FV | Future cost estimation    |
| Eligibility  | Max safe loan             |

---

##  UI/UX Highlights

*  Glassmorphism UI (modern fintech look)
*  Light/Dark Mode (300ms smooth transition)
*  Indian premium theme (Gold + Green palette)
*  Interactive Charts (Chart.js)
*  Fast, responsive SPA

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action          |
| -------- | --------------- |
| Alt + 1  | Dashboard       |
| Alt + 2  | EMI Calculator  |
| Alt + 3  | Stress Test     |
| Alt + 4  | Goal Planner    |
| Alt + 5  | CIBIL Simulator |
| Alt + 6  | Insights        |
| Alt + T  | Toggle Theme    |

---

##  Authentication (Backend)

* JWT-based authentication
* Secure password hashing (bcrypt)
* User financial profile storage

### API Endpoints

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile

POST /api/advisor/emi
POST /api/advisor/eligibility
POST /api/advisor/goal
POST /api/advisor/stress

GET  /api/health
```

---

## 🇮🇳 India-Focused Calculations

* ₹ INR formatting (`en-IN`)
* FOIR limit: **50%**
* Inflation: **6% (RBI standard)**
* Processing Fee: **2% + 18% GST**
* Tax regime: FY 2026–27 compliant

---

##  Demo Mode

Run this in browser console:

```javascript
loadDemoData()
```

Instantly loads sample financial data.

---

##  Tech Stack

### Frontend

* HTML5, CSS3, JavaScript
* Chart.js

### Backend

* Node.js
* Express.js
* MongoDB
* JWT Authentication

---

##  Future Improvements

*  Mobile App (React Native)
*  AI Loan Advisor (GPT-based insights)
*  Bank API integrations
*  Credit report import
*  Smart notifications

---

##  Contributing

Pull requests are welcome!
For major changes, please open an issue first.

---

##  License

MIT License © 2026 Sterling Advisory

---

##  Acknowledgment

Built with passion for a **ITSAHACK2.0**
by **Team Control Alt Defeat**

---

##  Final Note

> This is not just a tool — it's a **financial safety system**
> helping users avoid bad loans and make smarter decisions.
