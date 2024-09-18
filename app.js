import dotenv from 'dotenv'; // Cargar variables de entorno
import userRouter from './app/routes/user.route.js'
import express from 'express';
import cors from 'cors';
import { initDB } from './config/pg.js'

dotenv.config();

const app = express();
// Configurar CORS
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
// Configurar Express para leer JSON
app.use(express.json())


initDB();

//ruta generica
app.use('/api', userRouter)

// Iniciar el servidor
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });