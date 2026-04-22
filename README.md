# Vehicle Event Manager

Vehicle Event Manager (VEM) is a database-driven rental car fleet tracking system. It centralizes vehicle inventory, rental/event history, maintenance holds, damage reports, odometer updates, license plate information, and role-based workflows into one web application.

This project was built for CPSC 471 as a full-stack application backed by a PostgreSQL relational database.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, React Router, Axios, Lucide React |
| Backend | Node.js, Express, pg, dotenv, CORS |
| Database | PostgreSQL |
| Styling | Custom CSS |
| Tooling | npm, Create React App |

## Core Functionality

### Role-Based Access

VEM supports three user roles:

- `Manager`: Full access to fleet data and edit controls.
- `Employee`: Same fleet visibility as a manager, but read-only.
- `Mechanic`: Vehicle-focused maintenance view with no reservation tab.

### Fleet Inventory

- View all vehicles in the fleet.
- Search vehicles by unit number, license plate, or VIN.
- View vehicle make, model, plate, VIN, location, odometer, next PM, and current status.
- Add new vehicles as a manager.
- Edit vehicle details, including license plate and odometer.
- Delete vehicles as a manager with confirmation.
- Vehicle deletions remove related database records safely.

### Holds and Vehicle Status

- Add vehicle holds as a manager.
- Remove individual active holds.
- Mechanics can add and remove maintenance holds.
- Vehicle status is derived from database activity:
  - Active holds show `On Hold`.
  - Active maintenance shows `In Maintenance`.
  - Active rentals show `Rented`.
  - Otherwise the vehicle remains `Available` or its saved status.

### Damage Reports

- Mechanics can add damage reports to a vehicle.
- Mechanics can edit damage report details.
- Mechanics can delete damage reports from inside the edit modal.
- Severe damage reports place the vehicle on hold.
- Removing the last severe damage report resyncs the vehicle status.

### Dashboard

- The dashboard shows the fleet summary view.
- Displays total fleet size, available vehicles, in-service vehicles, utilization, status breakdown, cost/utilization style metrics, and summary charts/cards.

### Reservations

- Managers and employees can access reservation workflows.
- Mechanics do not see or use the reservation tab.

### Database Integration

- Frontend data comes from the Express API.
- Express API reads and writes to PostgreSQL.
- The database stores vehicles, registrations, customers, locations, employees, events, holds, rentals, maintenance records, condition checks, damage reports, equipment checks, movement records, and notes.

## Project Structure

```text
CPSC471-Final-Project-1/
├── backend/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
└── README.md
```

## Prerequisites

Install these before running the project:

- Node.js 18 or newer
- npm
- PostgreSQL 14 or newer

On Windows, if `psql` is not recognized, use the full PostgreSQL path:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

If your PostgreSQL version is not `16`, replace `16` with your installed version.

## Local Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd CPSC471-Final-Project-1
```

### 2. Install Dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### 3. Create the PostgreSQL Database

Open a terminal and connect to PostgreSQL:

```bash
psql -U postgres
```

Inside the `psql` prompt, run:

```sql
CREATE DATABASE vehicle_event_manager;
\q
```

If the database already exists and you want to recreate it:

```sql
DROP DATABASE vehicle_event_manager;
CREATE DATABASE vehicle_event_manager;
\q
```

### 4. Populate the Database

From the project root, run:

```bash
psql -U postgres -d vehicle_event_manager -f database/schema.sql
```

On Windows, if `psql` is not in your PATH:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d vehicle_event_manager -f database\schema.sql
```

The schema file creates the tables and inserts sample fleet data. Running it again resets the database back to the sample data.

### 5. Configure Backend Environment Variables

Create a backend `.env` file:

```bash
cd backend
cp .env.example .env
```

On Windows Command Prompt or PowerShell:

```powershell
cd backend
copy .env.example .env
```

Update `backend/.env` if needed:

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vehicle_event_manager
PORT=5000
```

Change `DB_PASSWORD` to match the PostgreSQL password you set during installation.

## Running the Project

You need two terminals: one for the backend and one for the frontend.

### Terminal 1: Start the Backend

```bash
cd backend
npm start
```

The API runs at:

```text
http://localhost:5000
```

Quick backend check:

```text
http://localhost:5000/api/vehicles
```

You should see JSON vehicle data.

### Terminal 2: Start the Frontend

```bash
cd frontend
npm start
```

The React app runs at:

```text
http://localhost:3000
```

Open that URL in your browser and select a role to begin.

## Useful Development Commands

Run the backend:

```bash
cd backend
npm start
```

Run the backend with nodemon:

```bash
cd backend
npm run dev
```

Run the frontend:

```bash
cd frontend
npm start
```

Build the frontend:

```bash
cd frontend
npm run build
```

Reset and repopulate the database:

```bash
psql -U postgres -d vehicle_event_manager -f database/schema.sql
```

## Database Overview

The database includes these main tables:

| Table | Purpose |
| --- | --- |
| `vehicle` | Stores fleet vehicle records |
| `registration` | Stores vehicle license plate registrations |
| `location` | Stores branch and lot locations |
| `employee` | Stores employee records |
| `customer` | Stores rental customer records |
| `customer_phone` | Stores customer phone numbers |
| `event` | Superclass table for vehicle events |
| `rental` | Rental-specific event data |
| `maintenance` | Maintenance-specific event data |
| `hold` | Vehicle hold add/remove records |
| `movement` | Vehicle location movement records |
| `condition_check` | Inspection and condition check records |
| `damage_report` | Damage records tied to condition events |
| `equipment` | Equipment checklist records |
| `note` | Free-text event notes |

## API Highlights

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/vehicles` | List all vehicles |
| `GET` | `/api/vehicles/search?q=...` | Search vehicles by unit number, license plate, VIN, make, or model |
| `GET` | `/api/vehicles/:vin` | Get one vehicle by VIN or unit number |
| `POST` | `/api/vehicles` | Add a vehicle |
| `PUT` | `/api/vehicles/:vin` | Update vehicle information |
| `DELETE` | `/api/vehicles/:vin` | Delete a vehicle and related records |
| `GET` | `/api/events/vehicle/:vin` | Get vehicle history |
| `POST` | `/api/events` | Create a vehicle event |
| `GET` | `/api/conditions/damages/:vin` | Get damage reports for a vehicle |
| `POST` | `/api/conditions/damages` | Add a damage report |
| `PUT` | `/api/conditions/damages/:eventId/:bodyArea` | Update a damage report |
| `DELETE` | `/api/conditions/damages/:eventId/:bodyArea` | Delete a damage report |
| `GET` | `/api/reservations` | List reservations |
| `POST` | `/api/reservations` | Create a reservation |
| `GET` | `/api/locations` | List locations |
| `GET` | `/api/customers` | List customers |
| `GET` | `/api/employees` | List employees |

## Troubleshooting

### `psql` is not recognized

Use the full PostgreSQL executable path:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Or add this folder to your system PATH:

```text
C:\Program Files\PostgreSQL\16\bin
```

### Frontend loads but data is missing

Check that:

- PostgreSQL is running.
- The backend is running on port `5000`.
- `backend/.env` has the correct database username, password, host, port, and database name.
- The database was populated with `database/schema.sql`.

### Backend says database authentication failed

Update `DB_PASSWORD` in `backend/.env` to match your local PostgreSQL password, then restart the backend.

### Changes are not showing in the browser

Restart the frontend:

```bash
cd frontend
npm start
```

If backend route or SQL changes were made, restart the backend too:

```bash
cd backend
npm start
```

## License

This project was created for academic coursework.
