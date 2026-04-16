const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const VEHICLE_EDITABLE_FIELDS = new Set([
  'unit_number',
  'year',
  'make',
  'model',
  'trim',
  'color',
  'car_class',
  'body_style',
  'fuel_type',
  'fuel_capacity',
  'engine_size',
  'horsepower',
  'tire_type',
  'num_wheels',
  'weight',
  'seat_count',
  'msrp',
  'odometer',
  'status',
  'location_code',
  'in_service_date',
  'new_or_used',
  'next_pm',
  'handicap_equipped',
  'dealer',
  'package',
]);

const RENTAL_STATUS_SQL = `
  CASE
    WHEN r.end_time IS NOT NULL AND r.end_time < NOW() THEN 'COMPLETED'
    WHEN r.start_time IS NOT NULL AND r.start_time <= NOW()
      AND (r.end_time IS NULL OR r.end_time >= NOW()) THEN 'ACTIVE'
    WHEN r.start_time IS NOT NULL AND r.start_time > NOW() THEN 'CONFIRMED'
    ELSE 'IN TRANSIT'
  END
`;

const VEHICLE_SELECT_SQL = `
  SELECT v.*, reg.plate, reg.expiration_date AS registration_expiration_date,
         l.name AS location_name,
         CASE
           WHEN COALESCE(holds.active_hold_count, 0) > 0 THEN holds.active_hold_count
           WHEN v.status = 'On Hold' AND latest_hold.reason IS NOT NULL THEN 1
           ELSE 0
         END::int AS active_hold_count,
         latest_hold.reason AS latest_hold_reason,
         CASE
           WHEN COALESCE(holds.active_hold_count, 0) > 0 OR v.status = 'On Hold'
             THEN 'On Hold'
           ELSE v.status
         END AS status
  FROM vehicle_with_age v
  LEFT JOIN LATERAL (
    SELECT plate, expiration_date
    FROM registration
    WHERE vin = v.vin
    ORDER BY expiration_date DESC NULLS LAST, plate
    LIMIT 1
  ) reg ON TRUE
  LEFT JOIN (
    WITH add_holds AS (
      SELECT e.vin, h.reason,
             ROW_NUMBER() OVER (
               PARTITION BY e.vin, h.reason
               ORDER BY e.timestamp ASC, e.event_id ASC
             ) AS add_rank
      FROM event e
      JOIN hold h ON e.event_id = h.event_id
      WHERE h.action = 'Add'
    ),
    remove_counts AS (
      SELECT e.vin, h.reason, COUNT(*)::int AS remove_count
      FROM event e
      JOIN hold h ON e.event_id = h.event_id
      WHERE h.action = 'Remove'
      GROUP BY e.vin, h.reason
    )
    SELECT a.vin, COUNT(*)::int AS active_hold_count
    FROM add_holds a
    LEFT JOIN remove_counts r ON r.vin = a.vin AND r.reason = a.reason
    WHERE a.add_rank > COALESCE(r.remove_count, 0)
    GROUP BY a.vin
  ) holds ON holds.vin = v.vin
  LEFT JOIN LATERAL (
    SELECT h.reason
    FROM event e
    JOIN hold h ON e.event_id = h.event_id
    WHERE e.vin = v.vin AND h.action = 'Add'
    ORDER BY e.timestamp DESC, e.event_id DESC
    LIMIT 1
  ) latest_hold ON TRUE
  LEFT JOIN location l ON l.location_code = v.location_code
`;

const VEHICLE_EVENT_SELECT_SQL = `
  SELECT e.event_id, e.event_type, e.timestamp, e.location_code, e.odometer, e.employee_id,
         loc.name AS location_name,
         h.reason AS hold_reason, h.action AS hold_action,
         n.content AS note_content,
         r.agreement_number, r.customer_id, r.start_location, r.return_location,
         r.start_time, r.end_time, r.odometer_out, r.odometer_in,
         m.reason AS maint_reason, m.action AS maint_action, m.subtype AS maint_subtype,
         cc.fuel_level, cc.notes AS cc_notes,
         mv.from_location, mv.to_location,
         c.first_name || ' ' || c.last_name AS customer_name,
         sl.name AS start_location_name,
         rl.name AS return_location_name,
         fl.name AS from_location_name,
         tl.name AS to_location_name,
         COALESCE(dr.damage_count, 0) AS damage_count
   FROM event e
   LEFT JOIN hold h ON e.event_id = h.event_id
   LEFT JOIN note n ON e.event_id = n.event_id
   LEFT JOIN rental r ON e.event_id = r.event_id
   LEFT JOIN maintenance m ON e.event_id = m.event_id
   LEFT JOIN condition_check cc ON e.event_id = cc.event_id
   LEFT JOIN movement mv ON e.event_id = mv.event_id
   LEFT JOIN customer c ON r.customer_id = c.customer_id
   LEFT JOIN location loc ON e.location_code = loc.location_code
   LEFT JOIN location sl ON r.start_location = sl.location_code
   LEFT JOIN location rl ON r.return_location = rl.location_code
   LEFT JOIN location fl ON mv.from_location = fl.location_code
   LEFT JOIN location tl ON mv.to_location = tl.location_code
   LEFT JOIN (
     SELECT event_id, COUNT(*)::int AS damage_count
     FROM damage_report
     GROUP BY event_id
   ) dr ON e.event_id = dr.event_id
`;

function pickAllowedFields(payload, allowedFields) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => allowedFields.has(key) && value !== undefined)
  );
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function findVehicle(client, vinOrUnit) {
  const result = await client.query(
    'SELECT * FROM vehicle WHERE vin = $1 OR unit_number = $1 LIMIT 1',
    [vinOrUnit]
  );
  return result.rows[0] || null;
}

async function hasActiveHold(client, vin) {
  const result = await client.query(
    `WITH add_holds AS (
       SELECT e.vin, h.reason,
              ROW_NUMBER() OVER (
                PARTITION BY e.vin, h.reason
                ORDER BY e.timestamp ASC, e.event_id ASC
              ) AS add_rank
       FROM event e
       JOIN hold h ON e.event_id = h.event_id
       WHERE e.vin = $1 AND h.action = 'Add'
     ),
     remove_counts AS (
       SELECT e.vin, h.reason, COUNT(*)::int AS remove_count
       FROM event e
       JOIN hold h ON e.event_id = h.event_id
       WHERE e.vin = $1 AND h.action = 'Remove'
       GROUP BY e.vin, h.reason
     )
     SELECT COUNT(*)::int AS active_hold_count
     FROM add_holds a
     LEFT JOIN remove_counts r ON r.vin = a.vin AND r.reason = a.reason
     WHERE a.add_rank > COALESCE(r.remove_count, 0)`,
    [vin]
  );

  return Number(result.rows[0]?.active_hold_count || 0) > 0;
}

async function hasActiveMaintenance(client, vin) {
  const result = await client.query(
    `SELECT GREATEST(
       COUNT(*) FILTER (WHERE m.action = 'Add') -
       COUNT(*) FILTER (WHERE m.action = 'Remove'),
       0
     )::int AS active_maintenance_count
     FROM event e
     JOIN maintenance m ON e.event_id = m.event_id
     WHERE e.vin = $1`,
    [vin]
  );

  return Number(result.rows[0]?.active_maintenance_count || 0) > 0;
}

async function syncVehicleOperationalStatus(client, vin, preferredStatus = 'Available') {
  const activeHold = await hasActiveHold(client, vin);
  if (activeHold) {
    await client.query('UPDATE vehicle SET status = $1 WHERE vin = $2', ['On Hold', vin]);
    return 'On Hold';
  }

  const activeMaintenance = await hasActiveMaintenance(client, vin);
  if (activeMaintenance) {
    await client.query('UPDATE vehicle SET status = $1 WHERE vin = $2', ['In Maintenance', vin]);
    return 'In Maintenance';
  }

  await client.query('UPDATE vehicle SET status = $1 WHERE vin = $2', [preferredStatus, vin]);
  return preferredStatus;
}

async function updateVehicleStatusForEvent(client, eventType, payload, vehicle) {
  const odometer = toNullableInt(payload.odometer);

  if (eventType === 'movement') {
    await client.query(
      `UPDATE vehicle
       SET location_code = COALESCE($1, location_code),
           odometer = COALESCE($2, odometer)
       WHERE vin = $3`,
      [payload.to_location || null, odometer, vehicle.vin]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, vehicle.status || 'Available');
    return;
  }

  if (eventType === 'condition_check') {
    await client.query(
      'UPDATE vehicle SET odometer = COALESCE($1, odometer) WHERE vin = $2',
      [odometer, vehicle.vin]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, vehicle.status || 'Available');
    return;
  }

  if (eventType === 'rental') {
    const status =
      payload.end_time && new Date(payload.end_time) < new Date()
        ? 'Available'
        : 'Rented';

    await client.query(
      `UPDATE vehicle
       SET status = $1,
           location_code = COALESCE($2, location_code),
           odometer = COALESCE($3, COALESCE($4, odometer))
       WHERE vin = $5`,
      [
        status,
        payload.return_location || payload.start_location || vehicle.location_code,
        toNullableInt(payload.odometer_in),
        toNullableInt(payload.odometer_out) ?? odometer,
        vehicle.vin,
      ]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, status);
    return;
  }

  if (eventType === 'maintenance') {
    await client.query(
      'UPDATE vehicle SET odometer = COALESCE($1, odometer) WHERE vin = $2',
      [odometer, vehicle.vin]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, payload.action === 'Remove' ? 'Available' : 'In Maintenance');
    return;
  }

  if (eventType === 'hold') {
    await client.query(
      'UPDATE vehicle SET odometer = COALESCE($1, odometer) WHERE vin = $2',
      [odometer, vehicle.vin]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, payload.action === 'Remove' ? 'Available' : 'On Hold');
    return;
  }

  if (eventType === 'note' && odometer !== null) {
    await client.query(
      'UPDATE vehicle SET odometer = $1 WHERE vin = $2',
      [odometer, vehicle.vin]
    );
    await syncVehicleOperationalStatus(client, vehicle.vin, vehicle.status || 'Available');
  }
}

app.get('/', (req, res) => {
  res.send('Vehicle Event Manager backend is running');
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const result = await pool.query(
      `${VEHICLE_SELECT_SQL}
       ORDER BY v.unit_number`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/vehicles/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchTerm = `%${q.toUpperCase()}%`;
    const result = await pool.query(
      `${VEHICLE_SELECT_SQL}
       WHERE UPPER(v.vin) LIKE $1
          OR UPPER(v.unit_number) LIKE $1
          OR UPPER(v.make) LIKE $1
          OR UPPER(v.model) LIKE $1
          OR UPPER(COALESCE(reg.plate, '')) LIKE $1
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
    const result = await pool.query(
      `${VEHICLE_SELECT_SQL}
       WHERE v.vin = $1 OR v.unit_number = $1
       LIMIT 1`,
      [req.params.vin]
    );
    const vehicle = result.rows[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/vehicles/:vin/registration', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registration WHERE vin = $1 ORDER BY expiration_date DESC NULLS LAST',
      [req.params.vin]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching registration:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/vehicles/:vin/holds', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH add_holds AS (
         SELECT e.event_id, e.vin, e.employee_id, e.timestamp, e.location_code, e.odometer,
                h.reason, loc.name AS location_name,
                ROW_NUMBER() OVER (
                  PARTITION BY e.vin, h.reason
                  ORDER BY e.timestamp ASC, e.event_id ASC
                ) AS add_rank
         FROM event e
         JOIN hold h ON e.event_id = h.event_id
         LEFT JOIN location loc ON e.location_code = loc.location_code
         WHERE e.vin = $1 AND h.action = 'Add'
       ),
       remove_counts AS (
         SELECT e.vin, h.reason, COUNT(*)::int AS remove_count
         FROM event e
         JOIN hold h ON e.event_id = h.event_id
         WHERE e.vin = $1 AND h.action = 'Remove'
         GROUP BY e.vin, h.reason
       )
       SELECT a.event_id, a.vin, a.employee_id, a.timestamp, a.location_code, a.odometer,
              a.reason, a.location_name
       FROM add_holds a
       LEFT JOIN remove_counts r ON r.vin = a.vin AND r.reason = a.reason
       WHERE a.add_rank > COALESCE(r.remove_count, 0)
       ORDER BY a.timestamp DESC, a.event_id DESC`,
      [req.params.vin]
    );

    if (result.rows.length === 0) {
      const fallback = await pool.query(
        `SELECT e.event_id, e.vin, e.employee_id, e.timestamp, e.location_code, e.odometer,
                h.reason, loc.name AS location_name
         FROM vehicle v
         JOIN event e ON e.vin = v.vin
         JOIN hold h ON e.event_id = h.event_id
         LEFT JOIN location loc ON e.location_code = loc.location_code
         WHERE v.vin = $1
           AND v.status = 'On Hold'
           AND h.action = 'Add'
         ORDER BY e.timestamp DESC, e.event_id DESC
         LIMIT 1`,
        [req.params.vin]
      );
      return res.json(fallback.rows);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active holds:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const {
      vin,
      unit_number,
      year,
      make,
      model,
      trim,
      color,
      car_class,
      body_style,
      fuel_type,
      fuel_capacity,
      engine_size,
      horsepower,
      tire_type,
      num_wheels,
      weight,
      seat_count,
      msrp,
      odometer,
      status,
      location_code,
      in_service_date,
      new_or_used,
      next_pm,
      handicap_equipped,
      dealer,
      package: vehiclePackage,
    } = req.body;

    if (!vin || !unit_number || !year || !make || !model || !car_class || odometer === undefined || odometer === null || odometer === '' || !location_code || !in_service_date) {
      return res.status(400).json({
        error: 'Missing required fields: vin, unit_number, year, make, model, car_class, odometer, location_code, in_service_date',
      });
    }

    const parsedYear = toNullableInt(year);
    const parsedOdometer = toNullableInt(odometer);

    if (!parsedYear || parsedYear < 1900) {
      return res.status(400).json({ error: 'Year must be a valid number.' });
    }

    if (parsedOdometer === null || parsedOdometer < 0) {
      return res.status(400).json({ error: 'Mileage/odometer must be a valid non-negative number.' });
    }

    const result = await pool.query(
      `INSERT INTO vehicle (
        vin, unit_number, year, make, model, trim, color, car_class, body_style,
        fuel_type, fuel_capacity, engine_size, horsepower, tire_type, num_wheels,
        weight, seat_count, msrp, odometer, status, location_code, in_service_date,
        new_or_used, next_pm, handicap_equipped, dealer, package
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      )
      RETURNING *`,
      [
        vin,
        unit_number,
        parsedYear,
        make,
        model,
        trim || null,
        color || null,
        car_class,
        body_style || null,
        fuel_type || null,
        toNullableNumber(fuel_capacity),
        toNullableNumber(engine_size),
        toNullableNumber(horsepower),
        tire_type || null,
        toNullableInt(num_wheels) || 4,
        toNullableInt(weight),
        toNullableInt(seat_count),
        toNullableNumber(msrp),
        parsedOdometer,
        status || 'Available',
        location_code,
        in_service_date || null,
        new_or_used || 'New',
        toNullableInt(next_pm),
        Boolean(handicap_equipped),
        dealer || null,
        vehiclePackage || null,
      ]
    );

    const synced = await pool.query(
      `${VEHICLE_SELECT_SQL}
       WHERE v.vin = $1
       LIMIT 1`,
      [result.rows[0].vin]
    );

    res.status(201).json(synced.rows[0] || result.rows[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error.message);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A vehicle with this VIN or unit number already exists.' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'The selected location does not exist in the database.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/vehicles/:vin', async (req, res) => {
  try {
    const fields = pickAllowedFields(req.body, VEHICLE_EDITABLE_FIELDS);
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No editable fields to update' });
    }

    const values = keys.map((key) => fields[key]);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    values.push(req.params.vin);

    const result = await pool.query(
      `UPDATE vehicle
       SET ${setClause}
       WHERE vin = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const synced = await pool.query(
      `${VEHICLE_SELECT_SQL}
       WHERE v.vin = $1
       LIMIT 1`,
      [result.rows[0].vin]
    );

    res.json(synced.rows[0] || result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/vehicles/:vin', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vehicle WHERE vin = $1 RETURNING *', [req.params.vin]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted', vehicle: result.rows[0] });
  } catch (error) {
    console.error('Error deleting vehicle:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/:vin', async (req, res) => {
  try {
    const result = await pool.query(
      `${VEHICLE_EVENT_SELECT_SQL}
       WHERE e.vin = $1
       ORDER BY e.timestamp DESC`,
      [req.params.vin]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/events/vehicle/:vin', async (req, res) => {
  try {
    const result = await pool.query(
      `${VEHICLE_EVENT_SELECT_SQL}
       WHERE e.vin = $1
       ORDER BY e.timestamp DESC`,
      [req.params.vin]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      event_type,
      vin,
      employee_id,
      location_code,
      odometer,
      content,
      reason,
      action,
      subtype,
      from_location,
      to_location,
      fuel_level,
      notes,
      equipment,
      agreement_number,
      customer_id,
      start_location,
      return_location,
      start_time,
      end_time,
      odometer_out,
      odometer_in,
    } = req.body;

    if (!event_type || !vin) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'event_type and vin are required' });
    }

    const vehicle = await findVehicle(client, vin);
    if (!vehicle) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const eventResult = await client.query(
      `INSERT INTO event (event_type, vin, employee_id, location_code, odometer)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING event_id`,
      [
        event_type,
        vehicle.vin,
        employee_id || null,
        location_code || vehicle.location_code || null,
        toNullableInt(odometer),
      ]
    );

    const eventId = eventResult.rows[0].event_id;

    switch (event_type) {
      case 'note':
        await client.query('INSERT INTO note (event_id, content) VALUES ($1, $2)', [eventId, content || '']);
        break;
      case 'hold':
        await client.query(
          'INSERT INTO hold (event_id, reason, action) VALUES ($1, $2, $3)',
          [eventId, reason || '', action || 'Add']
        );
        break;
      case 'maintenance':
        await client.query(
          'INSERT INTO maintenance (event_id, reason, action, subtype) VALUES ($1, $2, $3, $4)',
          [eventId, reason || '', action || 'Add', subtype || null]
        );
        break;
      case 'movement':
        await client.query(
          'INSERT INTO movement (event_id, from_location, to_location) VALUES ($1, $2, $3)',
          [eventId, from_location || vehicle.location_code || null, to_location || null]
        );
        break;
      case 'condition_check':
        await client.query(
          'INSERT INTO condition_check (event_id, fuel_level, notes) VALUES ($1, $2, $3)',
          [eventId, fuel_level || null, notes || null]
        );
        if (Array.isArray(equipment)) {
          for (const item of equipment) {
            await client.query(
              'INSERT INTO equipment (event_id, item_name, status) VALUES ($1, $2, $3)',
              [eventId, item.item_name, item.status]
            );
          }
        }
        break;
      case 'rental':
        await client.query(
          `INSERT INTO rental (
            event_id, agreement_number, customer_id, start_location, return_location,
            start_time, end_time, odometer_out, odometer_in
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            eventId,
            agreement_number || null,
            toNullableInt(customer_id),
            start_location || null,
            return_location || null,
            start_time || null,
            end_time || null,
            toNullableInt(odometer_out),
            toNullableInt(odometer_in),
          ]
        );
        break;
      default:
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Unsupported event type' });
    }

    await updateVehicleStatusForEvent(client, event_type, req.body, vehicle);
    await client.query('COMMIT');

    res.status(201).json({ event_id: eventId, event_type });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating event:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/conditions/:eventId', async (req, res) => {
  try {
    const ccResult = await pool.query(
      `SELECT cc.*, e.vin, e.timestamp, e.location_code, e.odometer, e.employee_id
       FROM condition_check cc
       JOIN event e ON cc.event_id = e.event_id
       WHERE cc.event_id = $1`,
      [req.params.eventId]
    );

    if (ccResult.rows.length === 0) {
      return res.status(404).json({ error: 'Condition check not found' });
    }

    const eqResult = await pool.query('SELECT * FROM equipment WHERE event_id = $1', [req.params.eventId]);
    const dmgResult = await pool.query('SELECT * FROM damage_report WHERE event_id = $1', [req.params.eventId]);

    res.json({
      ...ccResult.rows[0],
      equipment: eqResult.rows,
      damages: dmgResult.rows,
    });
  } catch (error) {
    console.error('Error fetching condition:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/conditions/damages/:vin', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dr.*, e.timestamp, e.event_id
       FROM damage_report dr
       JOIN event e ON dr.event_id = e.event_id
       WHERE e.vin = $1
       ORDER BY e.timestamp DESC`,
      [req.params.vin]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching damages:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/maintenance/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.event_id, e.vin, e.employee_id, e.timestamp, e.location_code, e.odometer,
              m.reason, m.action, m.subtype,
              v.unit_number, v.year, v.make, v.model, v.status AS vehicle_status,
              emp.first_name || ' ' || emp.last_name AS technician_name,
              r.plate,
              l.name AS location_name,
              CASE
                WHEN e.timestamp < NOW() - INTERVAL '7 days' AND m.action = 'Add' THEN 'Overdue'
                WHEN m.action = 'Add' THEN 'In Progress'
                ELSE 'Completed'
              END AS status
       FROM event e
       JOIN maintenance m ON e.event_id = m.event_id
       JOIN vehicle v ON e.vin = v.vin
       LEFT JOIN employee emp ON e.employee_id = emp.employee_id
       LEFT JOIN location l ON e.location_code = l.location_code
       LEFT JOIN registration r ON v.vin = r.vin
       ORDER BY e.timestamp DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/maintenance/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE e.timestamp < NOW() - INTERVAL '7 days' AND m.action = 'Add') AS overdue,
        COUNT(*) FILTER (WHERE m.action = 'Add' AND e.timestamp >= NOW() - INTERVAL '7 days') AS in_progress,
        COUNT(*) FILTER (WHERE m.action != 'Add') AS completed
       FROM event e
       JOIN maintenance m ON e.event_id = m.event_id`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching maintenance stats:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.event_id, e.vin, e.timestamp, e.location_code,
              r.agreement_number, r.customer_id, r.start_location, r.return_location,
              r.start_time, r.end_time, r.odometer_out, r.odometer_in,
              v.unit_number, v.year, v.make, v.model, v.car_class AS vehicle_class,
              v.status AS vehicle_status,
              c.first_name || ' ' || c.last_name AS customer_name,
              sl.name AS start_location_name,
              rl.name AS return_location_name,
              ${RENTAL_STATUS_SQL} AS rental_status,
              CASE
                WHEN r.odometer_in IS NOT NULL AND r.odometer_out IS NOT NULL
                  THEN ROUND((r.odometer_in - r.odometer_out) * 1.2, 2)
                ELSE NULL
              END AS total_cost
       FROM event e
       JOIN rental r ON e.event_id = r.event_id
       JOIN vehicle v ON e.vin = v.vin
       LEFT JOIN customer c ON r.customer_id = c.customer_id
       LEFT JOIN location sl ON r.start_location = sl.location_code
       LEFT JOIN location rl ON r.return_location = rl.location_code
       ORDER BY COALESCE(r.start_time, e.timestamp) DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reservations:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reservations', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      vin,
      employee_id,
      agreement_number,
      customer_id,
      start_location,
      return_location,
      start_time,
      end_time,
      odometer_out,
      odometer_in,
    } = req.body;

    if (!vin || !agreement_number || !customer_id || !start_location || !return_location || !start_time) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'vin, agreement_number, customer_id, start_location, return_location, and start_time are required',
      });
    }

    const vehicle = await findVehicle(client, vin);
    if (!vehicle) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const eventResult = await client.query(
      `INSERT INTO event (event_type, vin, employee_id, location_code, odometer)
       VALUES ('rental', $1, $2, $3, $4)
       RETURNING event_id`,
      [
        vehicle.vin,
        employee_id || null,
        start_location,
        toNullableInt(odometer_out) ?? vehicle.odometer,
      ]
    );

    const eventId = eventResult.rows[0].event_id;

    await client.query(
      `INSERT INTO rental (
        event_id, agreement_number, customer_id, start_location, return_location,
        start_time, end_time, odometer_out, odometer_in
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        eventId,
        agreement_number,
        toNullableInt(customer_id),
        start_location,
        return_location,
        start_time,
        end_time || null,
        toNullableInt(odometer_out) ?? vehicle.odometer,
        toNullableInt(odometer_in),
      ]
    );

    await updateVehicleStatusForEvent(client, 'rental', req.body, vehicle);
    await client.query('COMMIT');
    res.status(201).json({ event_id: eventId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating reservation:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.get('/api/reservations/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE r.start_time <= NOW() AND (r.end_time IS NULL OR r.end_time >= NOW())) AS active,
        COUNT(*) FILTER (WHERE r.start_time > NOW()) AS upcoming,
        COUNT(*) FILTER (WHERE r.end_time IS NOT NULL AND r.end_time::date = CURRENT_DATE) AS returns_today
       FROM event e
       JOIN rental r ON e.event_id = r.event_id`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching reservation stats:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employee ORDER BY employee_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employee WHERE employee_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM location ORDER BY location_code');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer ORDER BY customer_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.send('Backend is fully working and connected to the database!');
  } catch (error) {
    console.error('Database connectivity check failed:', error.message);
    res.status(500).send('Backend is running, but the database connection failed.');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
