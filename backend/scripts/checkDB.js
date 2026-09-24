require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const deptCols = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='departments' ORDER BY ordinal_position`
  );
  console.log('departments columns:', deptCols.rows.map(r => r.column_name).join(', '));

  const depts = await p.query('SELECT * FROM departments LIMIT 10');
  console.log('\ndepartments rows:', JSON.stringify(depts.rows, null, 2));

  const prescCols = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='prescriptions' ORDER BY ordinal_position`
  );
  console.log('\nprescriptions columns:', prescCols.rows.map(r => r.column_name).join(', '));

  const labCols = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='lab_tests' ORDER BY ordinal_position`
  );
  console.log('\nlab_tests columns:', labCols.rows.map(r => r.column_name).join(', '));

  const invoiceCols = await p.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='invoices' ORDER BY ordinal_position`
  );
  console.log('\ninvoices columns:', invoiceCols.rows.map(r => r.column_name).join(', '));

  await p.end();
}

check().catch(e => { console.error(e.message); p.end(); });
