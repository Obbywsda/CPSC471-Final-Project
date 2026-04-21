# Vehicle Event Manager

**CPSC 471 - Group 21 - Winter 2026**

A centralized, database-driven web application that consolidates vehicle information, event history, and operational status into a single interface for rental car fleet management.

## Tech Stack

| Layer    | Technology             |
|----------|------------------------|
| Frontend | React.js 18            |
| Backend  | Node.js + Express      |
| Database | PostgreSQL             |

## Prerequisites

- **Node.js** v18+ — [https://nodejs.org](https://nodejs.org)
- **PostgreSQL** v14+ — [https://www.postgresql.org/download](https://www.postgresql.org/download)

## Setup Instructions

These steps assume you are running the project on Windows with PowerShell or Command Prompt.

### Step 1: Install PostgreSQL

1. Download and install PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
2. During installation, set a password for the `postgres` user and remember it.
3. Keep the default port as `5432`.
4. Make sure the PostgreSQL service is running after installation.

If `psql` is not recognized in Windows Shell, use the full PostgreSQL path instead:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

If you installed a different PostgreSQL version, replace `16` with your installed version number. You can also add `C:\Program Files\PostgreSQL\16\bin` to your Windows `Path` environment variable so the shorter `psql` command works everywhere.

### Step 2: Install Project Dependencies

From the project root:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1

cd backend
npm install

cd ..\frontend
npm install
```

### Step 3: Create the Database

Open PowerShell or Command Prompt and connect to PostgreSQL:

```powershell
psql -U postgres
```

If `psql` is not in your `Path`, use:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Inside the `psql` prompt, create the database:

```sql
CREATE DATABASE vehicle_event_manager;
\q
```

### Step 4: Populate or Reset the Database

Run the schema file from the project root:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1
psql -U postgres -d vehicle_event_manager -f database\schema.sql
```

If `psql` is not in your `Path`, use:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d vehicle_event_manager -f database\schema.sql
```

This command creates all database tables and inserts the sample rental fleet data. The schema file starts by dropping existing tables, so running it again will reset the database back to the sample data.

### Step 5: Configure the Backend Database Connection

Create a backend environment file from the example:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1\backend
copy .env.example .env
```

Open `backend\.env` and make sure the values match your PostgreSQL setup:

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vehicle_event_manager
PORT=5000
```

If your PostgreSQL password is not `postgres`, change `DB_PASSWORD` to the password you set during installation.

### Step 6: Run the Backend

Open a terminal for the backend:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1\backend
npm start
```

The backend API should start on `http://localhost:5000`.

### Step 7: Run the Frontend

Open a second terminal for the frontend:

```powershell
cd C:\Users\s_cha\Documents\Coding\CPSC471\CPSC471-Final-Project-1\frontend
npm start
```

The React app should open at `http://localhost:3000`. If it does not open automatically, paste that URL into your browser.

### Step 8: Use the App

1. Open `http://localhost:3000`.
2. Select a role: `Manager`, `Employee`, or `Mechanic`.
3. Use the dashboard, fleet inventory, reservations, maintenance, and reports tabs.
4. Manager users can edit vehicle information, add vehicles, add holds, and remove active holds.
5. Employee users can view the same operational data without edit controls.
6. Mechanic users can view vehicle-related maintenance information, add maintenance holds, remove maintenance holds, and update vehicle maintenance details.

### Quick Health Checks

To confirm the backend can read the database, open this URL after starting the backend:

```text
http://localhost:5000/api/vehicles
```

You should see JSON vehicle data. If the frontend is blank or cannot load data, check that the backend is running and that `backend\.env` uses the same database name, username, password, host, and port that you used when creating the database.

## Database Schema

**15 tables** mapped from the Enhanced Entity-Relationship Diagram:

| Table | Type | Description |
|-------|------|-------------|
| `location` | Strong Entity | Branch/lot locations |
| `employee` | Strong Entity | Fleet employees |
| `vehicle` | Strong Entity | Vehicle fleet inventory |
| `customer` | Strong Entity | Rental customers |
| `customer_phone` | Multivalued Attr | Customer phone numbers |
| `event` | Superclass | All vehicle events (disjoint total specialization) |
| `condition_check` | Subclass of Event | Vehicle condition inspections |
| `rental` | Subclass of Event | Customer rental transactions |
| `maintenance` | Subclass of Event | Maintenance/repair records |
| `hold` | Subclass of Event | Vehicle hold statuses |
| `movement` | Subclass of Event | Vehicle location transfers |
| `note` | Subclass of Event | Free-text notes |
| `registration` | Weak Entity | License plate registrations (VIN, plate) |
| `damage_report` | Weak Entity | Condition damage records (event_id, body_area) |
| `equipment` | Related Entity | Equipment check items for condition checks |

## EERD Concepts Implemented

- **Disjoint total specialization** on EVENT (6 subclasses sharing `event_id` as PK/FK)
- **Weak entities**: `registration` (identified by VIN + plate), `damage_report` (identified by event_id + body_area)
- **Multivalued attribute**: `customer_phone` table
- **Derived attribute**: `vehicle_age` (computed view using current date minus model year)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List all vehicles |
| GET | `/api/vehicles/search?q=` | Search by VIN/unit#/plate |
| GET | `/api/vehicles/:id` | Get vehicle by VIN or unit# |
| GET | `/api/vehicles/:vin/registration` | Get registration info |
| PUT | `/api/vehicles/:vin` | Update vehicle fields |
| GET | `/api/events/vehicle/:vin` | Get event history for a vehicle |
| POST | `/api/events` | Create a new event |
| GET | `/api/conditions/:eventId` | Get condition check details |
| GET | `/api/conditions/damages/:vin` | Get all damage reports for a vehicle |
| GET | `/api/employees` | List all employees |
| GET | `/api/locations` | List all locations |
| GET | `/api/customers` | List all customers |
