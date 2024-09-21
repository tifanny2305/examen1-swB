import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();  // Cargar las variables de entorno

const sequelize = new Sequelize(
  process.env.DB_DATABASE,  // Nombre de la base de datos
  process.env.DB_USERNAME,  // Usuario
  process.env.DB_PASSWORD,  // Contraseña
  {
  host: process.env.DB_HOST,
  dialect: 'postgres',  // Aquí especificas el dialecto
  port: process.env.DB_PORT,
});

// Verificar conexión
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar todos los modelos con la base de datos
    await sequelize.sync({ alter: true });  // Esto crea las tablas si no existen, alter para actualizar la tabla sin eliminarla
    //await sequelize.sync({ force: true }); //desde cero

    console.log('Tablas sincronizadas con éxito.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
  }
};

export { sequelize, initDB };