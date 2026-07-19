import pool from './src/config/db.js';
pool.query("SELECT p.id, p.name, i.available FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.name ILIKE '%20x20 Frame Tent%'").then(res => {
  console.log(res.rows);
  process.exit(0);
});
