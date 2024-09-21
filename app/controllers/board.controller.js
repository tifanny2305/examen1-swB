import Board  from '../../models/board.js'; 
import users_boards from '../../models/user_boards.js';
import { v4 as uuidv4 } from 'uuid'; 

// 1. Crear una nueva board y convertir al creador en admin
    const createBoard = async (req, res) => {
    try {
      const { name } = req.body;  // `userId` viene del creador (admin) y `nombre` es el nombre de la sala
      const userId = req.user.id;

      // Generar un código único para la board
      const codigo = uuidv4().slice(0, 4).toUpperCase();  // Generar un código de 4 letras aleatorias
  
      // Crear la board en la base de datos
      const board = await Board.create({
        name,
        codigo,
        userId: userId  // Asignar al creador como admin
      });
  
      // Asociar al usuario como admin en la tabla intermedia users_boards
      await users_boards.create({
        userId,
        boardId: board.id,
        rol: 'admin'  // Asignar rol de admin
      });
  
      // Retornar la respuesta con el código y la información de la board
      return res.status(201).json({
        ok: true,
        msg: 'Board creada exitosamente',
        board: {
          id: board.id,
          name: board.name,
          codigo: board.codigo,
          userId: board.userId
        }
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
  };
  
  // 2. Unirse a una board como invitado usando el código
   const joinBoard = async (req, res) => {
    try {
      const { codigo } = req.body;  // `userId` es el ID del usuario que se quiere unir y `codigo` es el código de la sala
      const userId = req.user.id;
      console.log("User ID:", userId);
      
      // Buscar la board por el código
      const board = await Board.findOne({ where: { codigo } });
      if (!board) {
        return res.status(404).json({ ok: false, msg: 'Board no encontrada' });
      }

      // Verificar si el usuario es el creador de la board (admin)
      let rol = 'invitado';
      if (board.userId === userId) {
        rol = 'admin';  // El usuario que creó la sala es el admin
      }
  
      // Asignar al usuario como invitado en la tabla intermedia users_boards
      await users_boards.create({
        userId,
        boardId: board.id,
        rol 
      });
  
      // Retornar la respuesta con la información de la board
      return res.status(200).json({
        ok: true,
        msg: 'Te has unido a la board',
        board: {
          id: board.id,
          name: board.name,
          codigo: board.codigo,
          userId: board.userId,
          rol
        }
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
  };
  
  // 3. Eliminar una board (solo el admin puede hacerlo)
    const deleteBoard = async (req, res) => {
    try {
      const { userId, boardId } = req.body;
  
      // Buscar la board
      const board = await Board.findOne({ where: { id: boardId, adminId: userId } });
      if (!board) {
        return res.status(403).json({ ok: false, msg: 'No tienes permiso para eliminar esta board o no existe' });
      }
  
      // Eliminar la board
      await board.destroy();
  
      // Retornar la respuesta de éxito
      return res.status(200).json({ ok: true, msg: 'Board eliminada exitosamente' });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, msg: 'Error del servidor' });
    }
};

export const BoardController = {
    createBoard,
    joinBoard,
    deleteBoard
  }