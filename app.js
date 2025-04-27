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
let diagramas = {};
const usersInRooms = {};

// Unirse a una sala específica
io.on("connection", (socket) => {
  console.log(`Conectado con ID: ${socket.id}, User ID: ${socket.username}`);

  // Sala de ingreso
  socket.on('joinBoard', ({ codigo }) => {
    if (!codigo) {
      console.error('Código de sala no proporcionado');
      return;
    }

    console.log(`User ${socket.username} se unió a la sala: ${codigo}`);
    socket.join(codigo);

    // Enviar el estado actual del diagrama a este usuario
    if (diagramas[codigo]) {
      socket.emit('initialCanvasLoad', diagramas[codigo]);
    }

    // Agregar el usuario a la lista de usuarios en la sala
    if (!usersInRooms[codigo]) {
      usersInRooms[codigo] = [];
    }

    // Asegurarse de que no haya duplicados
    if (!usersInRooms[codigo].includes(socket.username)) {
      usersInRooms[codigo].push(socket.username);
    }

    // Notificar a todos los usuarios en la sala que uno nuevo se unió
    socket.broadcast.to(codigo).emit('Nuevo usuario se conecto', { userId: socket.userId });

    // Enviar la lista de usuarios actuales en la sala
    socket.emit('currentUsers', usersInRooms[codigo]);
  });

  // Escuchar el evento addComponent
  socket.on('addComponent', ({ roomCode, component }) => {
    console.log(`Nuevo componente añadido en la sala ${roomCode}:`, component);

    // Emitir el evento componentAdded a todos los clientes en la sala
    socket.to(roomCode).emit('componentAdded', component);
  });

  // Escuchar el evento de actualización de posición
  socket.on('updateComponent', ({ roomCode, componentId, newProperties }) => {
    console.log(`Componente ${componentId} actualizado en la sala ${roomCode}:`, newProperties);

    // Emitir el evento a los demás clientes en la sala
    socket.to(roomCode).emit('componentUpdated', { componentId, newProperties });
  });

  // Escuchar el evento de agregar un hijo
  socket.on('addChildComponent', ({ roomCode, parentId, child }) => {
    console.log(`Hijo añadido al componente ${parentId} en la sala ${roomCode}:`, child);

    // Emitir el evento a los demás clientes en la sala
    socket.to(roomCode).emit('childComponentAdded', { parentId, child });
  });

  // Eliminar un componente
  socket.on('removeComponent', ({ roomCode, componentId }) => {
    try {
      const components = diagramas[roomCode];
      if (!components) return;

      diagramas[roomCode] = components.filter(c => c.id !== componentId);
      io.to(roomCode).emit('componentRemoved', componentId);
    } catch (error) {
      console.error(`Error al eliminar componente: ${error.message}`);
    }
  });

  // Manejar la desconexión
  socket.on('disconnect', () => {
    console.log(`El usuario ${socket.username} se salio de la sala`);

    for (const room in usersInRooms) {
      usersInRooms[room] = usersInRooms[room].filter(user => user !== socket.username);
      socket.broadcast.to(room).emit('userDisconnected', { username: socket.username });
    }

  });

});

// Iniciar el servidor
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});