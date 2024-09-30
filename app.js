import dotenv from 'dotenv'; // Cargar variables de entorno
import userRouter from './app/routes/user.route.js'
import { verifySocketToken } from './app/middlewares/socket.middleware.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { initDB } from './config/pg.js';
import fileUpload from 'express-fileupload';

dotenv.config();
const app = express();

app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Configurar Express para leer JSON
app.use(express.json());
app.use(fileUpload());

initDB();
app.use('/api', userRouter)

// Crear servidor HTTP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'] 
});

// Aplicar el middleware de autenticación para Socket.IO
io.use(verifySocketToken);  

// Unirse a una sala específica
io.on("connection", (socket) => {
  console.log(`Un usuario se ha conectado con ID: ${socket.id}, User ID: ${socket.userId}`);

  socket.on('joinBoard', ({ codigo }) => {
    if (!codigo) {
      console.error('Código de sala no proporcionado');
      return;
    }
    console.log(`User ${socket.userId} joined board ${codigo}`);
    socket.join(codigo);  // El usuario se une a la sala
    socket.broadcast.to(codigo).emit('userJoined', { userId: socket.userId });
  });
  

  // Manejar actualizaciones de diagramas
  socket.on('sendDiagramUpdate', (data) => {
    const { codigo, diagramJson  } = data;   
    console.log(`Actualización del diagrama recibida en la sala ${codigo}`);
    socket.to(codigo).emit('reciveDiagramUpdate', diagramJson ); 
  });
  

  // Manejar la desconexión
  socket.on('disconnect', () => {
    console.log(`El usuario con ID ${socket.id} se ha desconectado`);
  });

});

// Iniciar el servidor
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});