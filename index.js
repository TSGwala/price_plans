import express from 'express';
import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4011;

// Middleware
app.use(express.static('public'));
app.use(express.json());

(async () => {
  try {
    // Setup SQLite database
    const db = await sqlite.open({
      filename: './price_plan.db',
      driver: sqlite3.Database
    });

    // Migrate database
    await db.migrate();

    // API Endpoints

    // POST /api/phonebill/
    app.post('/api/phonebill/', async (req, res) => {
      try {
        const { price_plan, actions } = req.body;
        const plan = await db.get('SELECT * FROM price_plan WHERE plan_name = ?', price_plan);

        if (!plan) {
          return res.status(404).json({ error: 'Price plan not found' });
        }

        const actionList = actions.split(',').map(action => action.trim());
        const total = actionList.reduce((acc, action) => {
          if (action === 'sms') return acc + plan.sms_price;
          if (action === 'call') return acc + plan.call_price;
          return acc;
        }, 0);

        res.json({ total: total.toFixed(2) });
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // GET /api/price_plans/
    app.get('/api/price_plans/', async (req, res) => {
      try {
        const plans = await db.all('SELECT * FROM price_plan');
        res.json(plans);
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // POST /api/price_plan/create
    app.post('/api/price_plan/create', async (req, res) => {
      try {
        const { name, call_cost, sms_cost } = req.body;
        await db.run('INSERT INTO price_plan (plan_name, sms_price, call_price) VALUES (?, ?, ?)', name, sms_cost, call_cost);
        res.json({ status: 'success', message: `Price plan '${name}' created.` });
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // POST /api/price_plan/update
    app.post('/api/price_plan/update', async (req, res) => {
      try {
        const { name, call_cost, sms_cost } = req.body;
        await db.run('UPDATE price_plan SET call_price = ?, sms_price = ? WHERE plan_name = ?', call_cost, sms_cost, name);
        res.json({ status: 'success', message: `Price plan '${name}' updated.` });
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // POST /api/price_plan/delete
    app.post('/api/price_plan/delete', async (req, res) => {
      try {
        const { id } = req.body;
        await db.run('DELETE FROM price_plan WHERE id = ?', id);
        res.json({ status: 'success', message: `Price plan with ID ${id} deleted.` });
      } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Start server after the database is ready
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
