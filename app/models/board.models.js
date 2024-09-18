import { db } from '../../config/pg.js';

// Crear una nueva board
const create = async (codigo, usuarioId) => {
    const client = await db.connect(); // Usamos transacciones para asegurar la integridad de los datos
    try {
      await client.query('BEGIN');
      
      // Crear la board
      const boardQuery = {
        text: `
          INSERT INTO board (codigo)
          VALUES ($1)
          RETURNING * 
        `,
        values: [codigo]
      };
      const boardResult = await client.query(boardQuery);
      const board = boardResult.rows[0];
  
      // Relacionar la board con el usuario creador como administrador en la tabla intermedia
      const relacionQuery = {
        text: `
          INSERT INTO board_usuario (usuario_id, board_id, rol)
          VALUES ($1, $2, 'admin')
        `,
        values: [usuarioId, board.id]
      };
      await client.query(relacionQuery);
  
      await client.query('COMMIT');
      return sala; // Retornar la board creada
    } catch (error) {
      await client.query('ROLLBACK');
      throw error; // Si hay un error, deshacer los cambios
    } finally {
      client.release();
    }
  };
  

// Buscar una board por código
const findBoard = async (codigo) => {
  const query = {
    text: `
    SELECT * FROM board
    WHERE codigo = $1
    `,
    values: [codigo]
  };

  const { rows } = await db.query(query);
  return rows[0];  
};

// Actualizar una sala y modificar la columna updated_at
/*const updateSala = async (codigo) => {
  const query = {
    text: `
    UPDATE sala
    SET updated_at = NOW()
    WHERE codigo = $1
    RETURNING *
    `,
    values: [codigo]
  };

  const { rows } = await db.query(query);
  return rows[0];  // Retornar la sala actualizada
};*/

// Eliminar una board (soft delete)
const deleteBoard = async (codigo) => {
  const query = {
    text: `
    UPDATE sala
    SET deleted_at = NOW()
    WHERE codigo = $1
    RETURNING *
    `,
    values: [codigo]
  };

  const { rows } = await db.query(query);
  return rows[0];  
};

export const BoardModel = {
  create,
  findBoard,
  //updateSala,
  deleteBoard
};
