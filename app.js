import dotenv from 'dotenv'; // Cargar variables de entorno
import userRouter from './app/routes/user.route.js'
import { verifySocketToken } from './app/middlewares/socket.middleware.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { initDB } from './config/pg.js';
import fileUpload from 'express-fileupload';
import Board from './models/board.js';

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
const usersInRooms = {};
const canvasStates = {};

// Unirse a una sala específica
io.on("connection", (socket) => {
  console.log(`Conectado con ID: ${socket.id}, User ID: ${socket.username}`);

  // Sala de ingreso
  socket.on('joinBoard', async ({ codigo }) => {
    if (!codigo) {
      console.error('Código de sala no proporcionado');
      return;
    }

    console.log(`User ${socket.username} se unió a la sala: ${codigo}`);
    socket.join(codigo);

    // Obtener el estado del diagrama desde la base de datos
    const board = await Board.findOne({ where: { codigo } });
    const state = board?.diagramJson || [];

    // Enviar el estado actual del diagrama a este usuario
    /*if (diagramas[codigo]) {
      socket.emit('initialCanvasLoad', diagramas[codigo]);
    }*/

    socket.emit('initialCanvasState', state);

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

  // Guardar el estado del canvas cuando se actualiza
  socket.on('saveCanvasState', async ({ roomCode, components }) => {

    // Guardar el estado en memoria
    //canvasStates[roomCode] = components;
    //console.log(`Estado guardado en memoria para la sala ${roomCode}`);

    // Guardar el estado en la base de datos
    const board = await Board.findOne({ where: { codigo: roomCode } });
    if (!board) {
      console.error(`Sala no encontrada: ${roomCode}`);
      return;
    }

    board.diagramJson = components; // Actualizar el campo diagramJson
    await board.save(); // Guardar en la base de datos
    console.log(`Estado guardado en la base de datos para la sala ${roomCode}`);

  });

  // Escuchar el evento addComponent
  socket.on('addComponent', async ({ roomCode, component }) => {
    console.log(`Nuevo componente añadido en la sala ${roomCode}:`, component);

    // Guardar el estado actualizado en la base de datos
    const board = await Board.findOne({ where: { codigo: roomCode } });
    if (board) {
      board.diagramJson = canvasStates[roomCode];
      await board.save(); // Guardar en la base de datos
      console.log(`Estado actualizado en la base de datos para la sala ${roomCode}`);
    }

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

  // Escuchar cambios de propiedades de un componente
  socket.on('updateComponentProperties', async ({ roomCode, componentId, updatedProperties }) => {
    console.log(`Propiedades actualizadas para el componente ${componentId} en la sala ${roomCode}:`, updatedProperties);

    // Obtener el estado actual del diagrama desde la base de datos
    const board = await Board.findOne({ where: { codigo: roomCode } });
    if (!board) {
      console.error(`Sala no encontrada: ${roomCode}`);
      return;
    }

    // Actualizar las propiedades del componente en el diagrama
    const findComponentById = (components, id) => {
      for (const comp of components) {
        if (comp.id === id) return comp;
        if (comp.children?.length) {
          const found = findComponentById(comp.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const updateComponentRecursive = (components, id, props) => {
      for (let i = 0; i < components.length; i++) {
        if (components[i].id === id) {
          // Si hay contenido, actualizarlo
          if (props.content !== undefined) {
            components[i].content = props.content;
          }

          // Actualizar todas las propiedades de estilo
          components[i].style = {
            ...components[i].style,
            ...props
          };

          return true;
        }

        if (components[i].children?.length) {
          if (updateComponentRecursive(components[i].children, id, props)) {
            return true;
          }
        }
      }
      return false;
    };

    const diagram = board.diagramJson || [];
    updateComponentRecursive(diagram, componentId, updatedProperties);

    // Guardar el diagrama actualizado en la base de datos
    board.diagramJson = diagram;
    await board.save();
    console.log(`Propiedades del componente ${componentId} actualizadas en la base de datos para la sala ${roomCode}`);

    // Emitir los cambios a los demás clientes en la sala
    socket.to(roomCode).emit('componentPropertiesUpdated', { componentId, updatedProperties });
  });

  // Escuchar el evento de eliminación de un componente
  socket.on('removeComponent', ({ roomCode, componentId }) => {
    console.log(`Componente eliminado en la sala ${roomCode}: ${componentId}`);

    // Emitir el evento a los demás clientes en la sala
    socket.to(roomCode).emit('componentRemoved', componentId);
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