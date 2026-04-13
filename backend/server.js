const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Vehicle Event Manager backend is running');
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicle ORDER BY vin');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Searching vehicles by VIN, unit number, or plate
app.get('/api/vehicles/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchTerm = `%${q.toUpperCase()}%`;
    const result = await pool.query(
      `SELECT v.*, r.plate
       FROM vehicle v
       LEFT JOIN registration r ON v.vin = r.vin
       WHERE UPPER(v.vin) LIKE $1
          OR UPPER(v.unit_number) LIKE $1
          OR UPPER(r.plate) LIKE $1
       ORDER BY v.unit_number`,
      [searchTerm]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching vehicles:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/vehicles/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const result = await pool.query(
      'SELECT * FROM vehicle WHERE vin = $1',
      [vin]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vehicle:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Getting registration info for a vehicle
app.get('/api/vehicles/:vin/registration', async (req, res) => {
  try {
    const { vin } = req.params;
    const result = await pool.query(
      'SELECT * FROM registration WHERE vin = $1',
      [vin]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching registration:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Updating vehicle fields
app.put('/api/vehicles/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = keys.map((key) => fields[key]);
    values.push(vin);

    const result = await pool.query(
      `UPDATE vehicle SET ${setClause} WHERE vin = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Getting employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employee ORDER BY employee_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Getting employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM employee WHERE employee_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Getting all locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM location ORDER BY location_code');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Getting all customers
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer ORDER BY customer_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const result = await pool.query(
      `SELECT event_id, event_type, timestamp, location_code, odometer, employee_id
       FROM event
       WHERE vin = $1
       ORDER BY timestamp DESC`,
      [vin]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/api/test', (req, res) => {
  res.send('Backend is fully working and connected to the database!');
});