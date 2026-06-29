const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata
    `);
    console.log('Schemas:');
    res.rows.forEach(r => console.log(r.schema_name));
    
    const tables = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'salary_records'
    `);
    console.log('salary_records locations:');
    tables.rows.forEach(r => console.log(r.table_schema, r.table_name));
  } finally {
    await client.end();
  }
}

main();
