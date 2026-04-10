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