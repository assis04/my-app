import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Client } = pg;
const client = new Client("postgresql://postgres:wohxaz5cuvfa@localhost:5432/ambisistem");
await client.connect();
try {
  const hash = await bcrypt.hash('123456', 10);
  await client.query("UPDATE users SET password = $1 WHERE email = 'rh@gmail.com' OR email = 'admin@ambisistem.com'", [hash]);
  console.log("Passwords reset to 123456");
} catch (e) {
  console.error("error:", e.message);
}
await client.end();
