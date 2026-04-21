-- ============================================================
-- Vehicle Event Manager - PostgreSQL Database Schema
-- CPSC 471 - Group 21
-- ============================================================

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS damage_report CASCADE;
DROP TABLE IF EXISTS condition_check CASCADE;
DROP TABLE IF EXISTS rental CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS hold CASCADE;
DROP TABLE IF EXISTS movement CASCADE;
DROP TABLE IF EXISTS note CASCADE;
DROP TABLE IF EXISTS event CASCADE;
DROP TABLE IF EXISTS registration CASCADE;
DROP TABLE IF EXISTS customer_phone CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS vehicle CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS location CASCADE;

-- ============================================================
-- LOCATION
-- ============================================================
CREATE TABLE location (
    location_code VARCHAR(10) PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    address       VARCHAR(200),
    city          VARCHAR(100),
    province      VARCHAR(50),
    country       VARCHAR(3) DEFAULT 'CAN'
);

-- ============================================================
-- EMPLOYEE
-- ============================================================
CREATE TABLE employee (
    employee_id VARCHAR(10) PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL,
    last_name   VARCHAR(50) NOT NULL,
    role        VARCHAR(50),
    location_code VARCHAR(10) REFERENCES location(location_code)
);

-- ============================================================
-- VEHICLE
-- ============================================================
CREATE TABLE vehicle (
    vin           VARCHAR(17) PRIMARY KEY,
    unit_number   VARCHAR(10) UNIQUE NOT NULL,
    year          INT NOT NULL,
    make          VARCHAR(50) NOT NULL,
    model         VARCHAR(50) NOT NULL,
    trim          VARCHAR(20),
    color         VARCHAR(30),
    car_class     VARCHAR(10),
    body_style    VARCHAR(30),
    fuel_type     VARCHAR(20),
    fuel_capacity DECIMAL(6,1),
    engine_size   DECIMAL(3,1),
    horsepower    DECIMAL(5,1),
    tire_type     VARCHAR(30),
    num_wheels    INT DEFAULT 4,
    weight        INT,
    seat_count    INT,
    msrp          DECIMAL(10,2),
    odometer      INT DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'Available',
    location_code VARCHAR(10) REFERENCES location(location_code),
    in_service_date DATE,
    new_or_used   VARCHAR(10) DEFAULT 'New',
    next_pm       INT,
    handicap_equipped BOOLEAN DEFAULT FALSE,
    dealer        VARCHAR(20),
    package       VARCHAR(10)
);

-- ============================================================
-- REGISTRATION (Weak Entity: identified by VIN + plate)
-- ============================================================
CREATE TABLE registration (
    vin             VARCHAR(17) REFERENCES vehicle(vin) ON DELETE CASCADE,
    plate           VARCHAR(15) NOT NULL,
    plate_type      VARCHAR(30) DEFAULT 'Non-Commercial',
    effective_date  DATE,
    expiration_date DATE,
    location_code   VARCHAR(10) REFERENCES location(location_code),
    country         VARCHAR(3) DEFAULT 'CAN',
    PRIMARY KEY (vin, plate)
);

-- ============================================================
-- CUSTOMER
-- ============================================================
CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL,
    last_name   VARCHAR(50) NOT NULL,
    email       VARCHAR(100),
    address     VARCHAR(200),
    city        VARCHAR(100),
    province    VARCHAR(50),
    country     VARCHAR(3) DEFAULT 'CAN'
);

-- ============================================================
-- CUSTOMER_PHONE (Multivalued attribute)
-- ============================================================
CREATE TABLE customer_phone (
    customer_id INT REFERENCES customer(customer_id) ON DELETE CASCADE,
    phone       VARCHAR(20) NOT NULL,
    phone_type  VARCHAR(20) DEFAULT 'Mobile',
    PRIMARY KEY (customer_id, phone)
);

-- ============================================================
-- EVENT (Superclass - Disjoint Total Specialization)
-- ============================================================
CREATE TABLE event (
    event_id      SERIAL PRIMARY KEY,
    event_type    VARCHAR(20) NOT NULL CHECK (event_type IN (
        'condition_check', 'rental', 'maintenance', 'hold', 'movement', 'note'
    )),
    vin           VARCHAR(17) NOT NULL REFERENCES vehicle(vin),
    employee_id   VARCHAR(10) REFERENCES employee(employee_id),
    timestamp     TIMESTAMP NOT NULL DEFAULT NOW(),
    location_code VARCHAR(10) REFERENCES location(location_code),
    odometer      INT
);

CREATE INDEX idx_event_vin ON event(vin);
CREATE INDEX idx_event_timestamp ON event(timestamp DESC);
CREATE INDEX idx_event_type ON event(event_type);

-- ============================================================
-- CONDITION_CHECK (Subclass of EVENT)
-- ============================================================
CREATE TABLE condition_check (
    event_id    INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    fuel_level  VARCHAR(20),
    notes       TEXT
);

-- ============================================================
-- RENTAL (Subclass of EVENT)
-- ============================================================
CREATE TABLE rental (
    event_id         INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    agreement_number VARCHAR(20),
    customer_id      INT REFERENCES customer(customer_id),
    start_location   VARCHAR(10) REFERENCES location(location_code),
    return_location  VARCHAR(10) REFERENCES location(location_code),
    start_time       TIMESTAMP,
    end_time         TIMESTAMP,
    odometer_out     INT,
    odometer_in      INT
);

-- ============================================================
-- MAINTENANCE (Subclass of EVENT)
-- ============================================================
CREATE TABLE maintenance (
    event_id INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    reason   VARCHAR(100) NOT NULL,
    action   VARCHAR(20) DEFAULT 'Add',
    subtype  VARCHAR(50)
);

-- ============================================================
-- HOLD (Subclass of EVENT)
-- ============================================================
CREATE TABLE hold (
    event_id INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    reason   VARCHAR(100) NOT NULL,
    action   VARCHAR(20) DEFAULT 'Add'
);

-- ============================================================
-- MOVEMENT (Subclass of EVENT)
-- ============================================================
CREATE TABLE movement (
    event_id      INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    from_location VARCHAR(10) REFERENCES location(location_code),
    to_location   VARCHAR(10) REFERENCES location(location_code)
);

-- ============================================================
-- NOTE (Subclass of EVENT)
-- ============================================================
CREATE TABLE note (
    event_id INT PRIMARY KEY REFERENCES event(event_id) ON DELETE CASCADE,
    content  TEXT NOT NULL
);

-- ============================================================
-- DAMAGE_REPORT (Weak Entity: identified by event_id + body_area)
-- ============================================================
CREATE TABLE damage_report (
    event_id    INT REFERENCES event(event_id) ON DELETE CASCADE,
    body_area   VARCHAR(50) NOT NULL,
    damage_type VARCHAR(30) NOT NULL CHECK (damage_type IN ('Damage', 'Wear and Tear')),
    severity    VARCHAR(20),
    -- description TEXT,
    -- PRIMARY KEY (event_id, body_area)
    description TEXT,
    repair_cost DECIMAL(10,2),
    mechanic_notes TEXT,
    PRIMARY KEY (event_id, body_area)

);

-- ============================================================
-- EQUIPMENT (Related to Condition Checks)
-- ============================================================
CREATE TABLE equipment (
    event_id  INT REFERENCES condition_check(event_id) ON DELETE CASCADE,
    item_name VARCHAR(50) NOT NULL,
    status    VARCHAR(10) NOT NULL CHECK (status IN ('Present', 'Missing')),
    PRIMARY KEY (event_id, item_name)
);

-- ============================================================
-- VIEW: Derived attribute - vehicle_age
-- ============================================================
CREATE OR REPLACE VIEW vehicle_with_age AS
SELECT *,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, make_date(year, 1, 1)))::INT AS vehicle_age
FROM vehicle;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Locations
INSERT INTO location (location_code, name, address, city, province, country) VALUES
('C545',  'Calgary Airport',      '2001 Airport Rd NE',    'Calgary',   'AB', 'CAN'),
('C459',  'Calgary Downtown',     '119 5th Ave SE',        'Calgary',   'AB', 'CAN'),
('C486',  'Calgary South',        '7004 Macleod Trail SE', 'Calgary',   'AB', 'CAN'),
('C438',  'Calgary Crowfoot',     '220 Crowfoot Cres NW',  'Calgary',   'AB', 'CAN'),
('D435',  'Edmonton Downtown',    '10135 100A St NW',      'Edmonton',  'AB', 'CAN'),
('E1C545','Calgary Airport East', '2001 Airport Rd NE',    'Calgary',   'AB', 'CAN'),
('E1C459','Calgary Downtown East','119 5th Ave SE',        'Calgary',   'AB', 'CAN'),
('V200',  'Vancouver Airport',    '3231 Grant McConachie', 'Richmond',  'BC', 'CAN'),
('V210',  'Vancouver Downtown',   '1050 Granville St',     'Vancouver', 'BC', 'CAN'),
('T100',  'Toronto Pearson',      '5975 Airport Rd',       'Mississauga','ON','CAN');

-- Employees
INSERT INTO employee (employee_id, first_name, last_name, role, location_code) VALUES
('E22DD7', 'Yasir',  'Hussain',  'Fleet Manager',     'C545'),
('E10A23', 'Sarah',  'Johnson',  'Service Advisor',   'C459'),
('E30B12', 'Mike',   'Chen',     'Lot Attendant',     'C545'),
('E40C99', 'Priya',  'Patel',    'Branch Manager',    'C486'),
('E50D44', 'James',  'Wilson',   'Fleet Coordinator', 'D435');

-- Vehicles
INSERT INTO vehicle (vin, unit_number, year, make, model, trim, color, car_class, body_style, fuel_type, fuel_capacity, engine_size, horsepower, tire_type, num_wheels, weight, seat_count, msrp, odometer, status, location_code, in_service_date, new_or_used, next_pm, handicap_equipped, dealer, package) VALUES
('1FTFW3L85NKF02232', '8G60MY', 2025, 'Ford',    'F150',     '1TS4',  'BLACK',  'PPBR', 'Truck',     'Unleaded', 136.3, 3.5, 400.0, 'All-Season',    4, 4941, 5, 68940.00, 13317, 'On Hold',   'C545', '2025-09-16', 'New',  13200, FALSE, '1TS4', 'BC'),
('2T1BURHE0KC123456', '7H20AB', 2024, 'Toyota',  'Camry',    'SE',    'WHITE',  'ICAR', 'Sedan',     'Unleaded', 60.6,  2.5, 203.0, 'All-Season',    4, 3310, 5, 32000.00, 24500, 'Available', 'C459', '2024-03-15', 'New',  25000, FALSE, 'TYSE', 'AB'),
('WBAJB9C51KB654321', '5K90CD', 2024, 'BMW',     '330i',     'xDrive','BLUE',   'FCAR', 'Sedan',     'Premium',  59.0,  2.0, 255.0, 'Performance',   4, 3582, 5, 48500.00, 18200, 'Available', 'C486', '2024-06-20', 'New',  20000, FALSE, 'BMXD', 'AB'),
('5YJSA1E22MF987654', '3E50EF', 2025, 'Tesla',   'Model 3',  'LR',   'RED',    'ECAR', 'Sedan',     'Electric', 0.0,   0.0, 346.0, 'All-Season',    4, 3862, 5, 55000.00, 8100,  'Rented',    'V200', '2025-01-10', 'New',  NULL,  FALSE, 'TSLR', 'BC'),
('1C4RJFBG5LC246810', '9F70GH', 2023, 'Jeep',    'Grand Cherokee','Limited','GREY','SFAR','SUV',     'Unleaded', 75.7,  3.6, 293.0, 'All-Terrain',   4, 4513, 5, 52000.00, 31400, 'Available', 'D435', '2023-08-01', 'New',  32000, FALSE, 'JPGL', 'AB'),
('1HGCV1F34LA135790', '2D40IJ', 2024, 'Honda',   'Accord',   'Sport', 'SILVER', 'ICAR', 'Sedan',     'Unleaded', 54.0,  1.5, 192.0, 'All-Season',    4, 3131, 5, 34000.00, 15600, 'In Maintenance','C545','2024-05-11','New', 16000, FALSE, 'HNAS', 'AB'),
('3GNKBBRS0NS112233', '6J80KL', 2025, 'Chevrolet','Equinox',  'LT',   'GREEN',  'IFAR', 'SUV',      'Unleaded', 55.0,  1.5, 175.0, 'All-Season',    4, 3274, 5, 33500.00, 4200,  'Available', 'V210', '2025-02-28', 'New',  5000,  FALSE, 'CVLT', 'BC'),
('WA1LAAF77ND445566', '4L10MN', 2025, 'Audi',    'Q5',       'Premium','WHITE', 'PCAR', 'SUV',      'Premium',  65.0,  2.0, 261.0, 'All-Season',    4, 4045, 5, 56000.00, 2300,  'Available', 'T100', '2025-04-05', 'New',  5000,  FALSE, 'ADQ5', 'ON'),
('5TFBY5F18NX778899', '1M30OP', 2025, 'Toyota',  'Tundra',   'SR5',   'BLACK',  'PPAR', 'Truck',    'Unleaded', 128.0, 3.4, 389.0, 'All-Terrain',   4, 5150, 6, 55000.00, 6800,  'Available', 'C545', '2025-07-01', 'New',  7500,  FALSE, 'TYT5', 'AB'),
('1N4BL4BV4LC998877', '8N20QR', 2024, 'Nissan',  'Altima',   'SV',    'GREY',   'ICAR', 'Sedan',    'Unleaded', 61.0,  2.5, 188.0, 'All-Season',    4, 3208, 5, 29500.00, 22300, 'Available', 'C438', '2024-04-22', 'New',  25000, FALSE, 'NASV', 'AB');

-- Registrations
INSERT INTO registration (vin, plate, plate_type, effective_date, expiration_date, location_code, country) VALUES
('1FTFW3L85NKF02232', 'XG9369', 'Non-Commercial', '2025-11-12', '2026-11-30', 'C486', 'CAN'),
('2T1BURHE0KC123456', 'AB1234', 'Non-Commercial', '2024-04-01', '2025-04-01', 'C459', 'CAN'),
('WBAJB9C51KB654321', 'CD5678', 'Non-Commercial', '2024-07-15', '2025-07-15', 'C486', 'CAN'),
('5YJSA1E22MF987654', 'EF9012', 'Non-Commercial', '2025-02-01', '2026-02-01', 'V200', 'CAN'),
('1C4RJFBG5LC246810', 'GH3456', 'Non-Commercial', '2023-09-01', '2024-09-01', 'D435', 'CAN'),
('1HGCV1F34LA135790', 'IJ7890', 'Non-Commercial', '2024-06-01', '2025-06-01', 'C545', 'CAN'),
('3GNKBBRS0NS112233', 'KL1122', 'Non-Commercial', '2025-03-15', '2026-03-15', 'V210', 'CAN'),
('WA1LAAF77ND445566', 'MN3344', 'Non-Commercial', '2025-05-01', '2026-05-01', 'T100', 'CAN'),
('5TFBY5F18NX778899', 'OP5566', 'Non-Commercial', '2025-08-01', '2026-08-01', 'C545', 'CAN'),
('1N4BL4BV4LC998877', 'QR7788', 'Non-Commercial', '2024-05-15', '2025-05-15', 'C438', 'CAN');

-- Customers
INSERT INTO customer (first_name, last_name, email, address, city, province, country) VALUES
('Harru',   'Sandhu',   'harru.sandhu@email.com',   '123 Main St',    'Calgary',   'AB', 'CAN'),
('Emily',   'Taylor',   'emily.taylor@email.com',   '456 Oak Ave',    'Vancouver', 'BC', 'CAN'),
('John',    'Smith',    'john.smith@email.com',      '789 Pine Rd',    'Edmonton',  'AB', 'CAN'),
('Lisa',    'Wang',     'lisa.wang@email.com',       '321 Elm St',     'Toronto',   'ON', 'CAN'),
('David',   'Brown',    'david.brown@email.com',     '654 Maple Dr',   'Calgary',   'AB', 'CAN');

-- Customer Phones
INSERT INTO customer_phone (customer_id, phone, phone_type) VALUES
(1, '403-555-0101', 'Mobile'),
(1, '403-555-0102', 'Home'),
(2, '604-555-0201', 'Mobile'),
(3, '780-555-0301', 'Mobile'),
(4, '416-555-0401', 'Mobile'),
(5, '403-555-0501', 'Mobile');

-- Events for VIN 1FTFW3L85NKF02232 (Ford F150 - the one shown in screenshots)
INSERT INTO event (event_type, vin, employee_id, timestamp, location_code, odometer) VALUES
('hold',        '1FTFW3L85NKF02232', 'E22DD7', '2026-01-30 18:21:00', 'C545', 13317),
('note',        '1FTFW3L85NKF02232', 'E22DD7', '2026-01-30 18:21:00', 'C545', NULL),
('note',        '1FTFW3L85NKF02232', 'E10A23', '2026-01-30 02:59:00', 'C459', NULL),
('rental',      '1FTFW3L85NKF02232', 'E10A23', '2026-01-29 09:28:00', 'C459', 12272),
('maintenance', '1FTFW3L85NKF02232', 'E10A23', '2026-01-28 18:46:00', 'C459', NULL),
('condition_check','1FTFW3L85NKF02232','E30B12','2026-01-28 08:00:00', 'C545', 12272),
('movement',    '1FTFW3L85NKF02232', 'E30B12', '2026-01-27 14:30:00', 'C545', 12200);

-- Events for other vehicles
INSERT INTO event (event_type, vin, employee_id, timestamp, location_code, odometer) VALUES
('rental',      '2T1BURHE0KC123456', 'E10A23', '2026-01-25 10:00:00', 'C459', 24000),
('condition_check','2T1BURHE0KC123456','E30B12','2026-01-24 09:00:00', 'C459', 24000),
('maintenance', 'WBAJB9C51KB654321', 'E40C99', '2026-01-20 11:00:00', 'C486', 18100),
('rental',      '5YJSA1E22MF987654', 'E50D44', '2026-01-22 14:00:00', 'V200', 7800),
('hold',        '1HGCV1F34LA135790', 'E22DD7', '2026-01-26 09:00:00', 'C545', 15600),
('movement',    '1C4RJFBG5LC246810', 'E50D44', '2026-01-18 16:00:00', 'D435', 31000),
('note',        '3GNKBBRS0NS112233', 'E30B12', '2026-01-15 12:00:00', 'V210', NULL),
('condition_check','WA1LAAF77ND445566','E40C99','2026-01-28 15:00:00', 'T100', 2300),
('rental',      '1N4BL4BV4LC998877', 'E10A23', '2026-01-23 08:30:00', 'C438', 22000);

-- Subclass: Hold
INSERT INTO hold (event_id, reason, action) VALUES
(1, 'Prev. Maintenance', 'Add'),
(12, 'Body Damage', 'Add');

-- Subclass: Note
INSERT INTO note (event_id, content) VALUES
(2, 'C5N1'),
(3, 'Odometer changed from 12272 to 12867.'),
(14, 'Vehicle in excellent condition, ready for lot display.');

-- Subclass: Rental
INSERT INTO rental (event_id, agreement_number, customer_id, start_location, return_location, start_time, end_time, odometer_out, odometer_in) VALUES
(4,  '25XR9K', 1, 'C459', 'C545', '2026-01-29 09:28:00', '2026-01-30 20:19:00', 12272, 13317),
(8,  '25AB01', 2, 'C459', 'C459', '2026-01-25 10:00:00', '2026-01-27 15:00:00', 24000, 24500),
(11, '25CD02', 3, 'V200', 'V200', '2026-01-22 14:00:00', '2026-01-24 10:00:00', 7800, 8100),
(16, '25EF03', 5, 'C438', 'C438', '2026-01-23 08:30:00', '2026-01-25 17:00:00', 22000, 22300);

-- Subclass: Maintenance
INSERT INTO maintenance (event_id, reason, action, subtype) VALUES
(5,  'Body Damage', 'Add', 'Repair'),
(10, 'Oil Change', 'Add', 'Scheduled');

-- Subclass: Condition Check
INSERT INTO condition_check (event_id, fuel_level, notes) VALUES
(6,  '3/4',  'Minor scratch on rear bumper noted.'),
(9,  'Full', 'Vehicle in good condition.'),
(15, 'Full', 'New vehicle intake inspection.');

-- Subclass: Movement
INSERT INTO movement (event_id, from_location, to_location) VALUES
(7,  'C486', 'C545'),
(13, 'C545', 'D435');

-- Equipment for condition checks
INSERT INTO equipment (event_id, item_name, status) VALUES
(6, 'Key 1',                   'Present'),
(6, 'Key 2',                   'Present'),
(6, 'Spare Tire/Inflator Kit', 'Present'),
(9, 'Key 1',                   'Present'),
(9, 'Key 2',                   'Missing'),
(9, 'Spare Tire/Inflator Kit', 'Present'),
(15, 'Key 1',                  'Present'),
(15, 'Key 2',                  'Present'),
(15, 'Spare Tire/Inflator Kit','Present');

-- Damage Reports
INSERT INTO damage_report (event_id, body_area, damage_type, severity, description) VALUES
(6, 'Rear Bumper',       'Damage',       'Minor', 'Small scratch approximately 3 inches'),
(6, 'Driver Side Door',  'Wear and Tear','Minor', 'Light scuff marks from normal use'),
(9, 'Hood',              'Wear and Tear','Minor', 'Small stone chips from highway driving');
