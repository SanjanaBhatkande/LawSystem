# SmartCase — Legal Case Management System

## Setup Instructions

### Requirements
- PHP 7.4+ with PDO MySQL extension
- MySQL 5.7+ / MariaDB 10.3+
- A local web server (XAMPP / WAMP / Laragon / MAMP)

---

### Step 1 — Import the Database
Run the SQL file in `database/schema.sql` in your MySQL client (phpMyAdmin or CLI):

```bash
mysql -u root -p < database/schema.sql
```

---

### Step 2 — Configure Database Connection
Open `api/db.php` and update credentials if needed:

```php
$host   = 'localhost';
$dbname = 'SmartCaseSystem';
$user   = 'root';
$pass   = '';           // ← change if you have a password
```

---

### Step 3 — Serve the Project
Place the entire `smartcase/` folder in your web server root:

- **XAMPP**: `C:/xampp/htdocs/smartcase/`
- **WAMP**: `C:/wamp64/www/smartcase/`
- **Laragon**: `C:/laragon/www/smartcase/`

Then open: `http://localhost/smartcase/`

---

## Features

| Feature | SQL Used |
|---|---|
| Dashboard stats | `SELECT COUNT(*)`, `GROUP BY Priority` |
| Case Dashboard view | `SELECT * FROM CaseDashboard` (VIEW) |
| Add Client | `CALL Add_Client(...)` |
| Add Case | `CALL Add_Case(...)` |
| Schedule Hearing | `CALL Add_Hearing(...)` (triggers `Auto_Update_Status_By_Date`) |
| Search Cases | `CALL Search_Cases(...)` |
| Filter & Sort | `CALL Filter_Sort_Cases(...)` |
| List all data | Direct SELECT with JOINs |
| Delete records | DELETE statements |

---

## File Structure
```
smartcase/
├── index.html          ← Main UI (HTML + CSS + JS)
├── assets/
│   ├── style.css       ← All styles
│   └── app.js          ← All frontend logic
├── api/
│   ├── db.php          ← Database connection
│   ├── clients.php     ← Clients API
│   ├── cases.php       ← Cases API
│   └── hearings.php    ← Hearings & Judges API
└── README.md
```
