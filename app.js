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
    //console.log(`User ${socket.username } se unio a ls sala: ${codigo}`);

    // Enviar el estado actual del diagrama a este usuario
    if (diagramas[codigo]) {
      socket.emit('diagramData', diagramas[codigo]);
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
    socket.broadcast.to(codigo).emit('Nuevo usuario se conecto', { userId: socket.userId  });
    
    // Enviar la lista de usuarios actuales en la sala
    socket.emit('currentUsers', usersInRooms[codigo]);
  
  });
  
  // Solicitar datos del diagrama dinámico
  socket.on('requestDiagramData', async ({ roomCode }) => {
    try {
      if (!diagramas[roomCode]) {
        diagramas[roomCode] = {
          roomCode,
          nodeDataArray: [],  // Inicialmente vacío
          linkDataArray: []   // Inicialmente vacío
        };
      }
      // Envía los datos del diagrama específico de la sala solicitada
      socket.emit('diagramData', diagramas[roomCode]); 
    } catch (error) {
      console.error('Error al obtener el diagrama:', error);
    }
  });

  // Manejar actualizaciones de diagramas
  socket.on('sendDiagramUpdate', (data) => {
    const { roomCode, updateType, data: updateData } = data;
  
    // Dependiendo del tipo de acción, aplicar los cambios en el diagrama de la sala
    if (updateType === 'addClass') {
      // Almacenar la nueva clase en el diagrama de la sala
      diagramas[roomCode].nodeDataArray.push(updateData);

    } else if (updateType === 'updateNodePosition') {
      const nodeToUpdate = diagramas[roomCode].nodeDataArray.find(node => node.key === updateData.key);
      if (nodeToUpdate) {
        nodeToUpdate.location = updateData.location;
      }

    } else if (updateType === 'updateAttribute') {
      const classToUpdate = diagramas[roomCode].nodeDataArray.find(node => node.key === updateData.key);
      if (classToUpdate) {
        classToUpdate.attributes.push(updateData.newAttribute);
      }
    } else if (updateType === 'updateMethod') {
      const classToUpdate = diagramas[roomCode].nodeDataArray.find(node => node.key === updateData.key);
      if (classToUpdate) {
        classToUpdate.methods.push(updateData.newMethod);
      }
    }
  
    // Emitir los cambios a todos los demás usuarios en la sala
    socket.broadcast.to(roomCode).emit('reciveDiagramUpdate', {
      updateType: updateType,
      data: updateData
    });

  });
  
  // Manejar la desconexión
  socket.on('disconnect', () => {
    console.log(`El usuario ${socket.username } se salio de la sala`);

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