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

### Step 1: Install PostgreSQL

1. Download and install PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. During installation, set a password for the `postgres` user (remember this)
3. Keep the default port as `5432`
4. After installation, make sure the PostgreSQL service is running

### Step 2: Create the Database

Open a terminal (Command Prompt or PowerShell) and run:

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside the psql prompt, create the database:
CREATE DATABASE vehicle_event_manager;

# Exit psql
\q
```

### Step 3: Initialize the Schema and Seed Data

```bash
# From the project root, run the schema file against the new database:
psql -U postgres -d vehicle_event_manager -f database/schema.sql
```

This creates all 15 tables and populates them with sample data (10 vehicles, 5 employees, 10 locations, 16 events, etc.).

### Step 4: Configure the Backend

Edit `backend/.env` if your PostgreSQL credentials differ from the defaults:

```
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vehicle_event_manager
PORT=5000
```

### Step 5: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 6: Start the Application

Open **two** terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
```
Server starts at `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
React dev server starts at `http://localhost:3000`

### Step 7: Use the App

1. Open `http://localhost:3000` in your browser
2. You'll see the **Tasks** page (main menu)
3. Use the **VIN search bar** (top-right) to search for a vehicle:
   - Try searching: `8G60MY`, `F150`, or `XG9369`
4. Once a vehicle is selected, click any task:
   - **VEHICLE HISTORY** — view full event timeline
   - **VEHICLE INQUIRY** — view Logistics, Vehicle Info, and Infleeting details
   - **CONDITION** — view/add condition reports with damage tracking
   - **MOVEMENT** — move a vehicle between locations

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
