import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();  // Cargar las variables de entorno
const { Pool } = pg;

const db = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: String(process.env.DB_PASSWORD),
});

// Crear la tabla "users" si no existe
const initDB = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `;
  try {
    await db.query(createUsersTableQuery);
    console.log('Tabla "users" verificada/creada correctamente');
  } catch (error) {
    console.error('Error al crear la tabla "users":', error.stack);
  }
};

export { db, initDB }; 