import { db } from '../../config/pg.js' 
import pg from 'pg'
const { Pool } = pg

// Crear un nuevo usuario y almacenar en la base de datos
const create = async (username, password) => {
  const query = {
    text: `
    INSERT INTO users (username, password)
    VALUES ($1, $2)
    RETURNING * 
    `,
    values: [username, password]
  }
  
  const {rows} = await db.query(query)
  return rows[0]
};
  
const findUser = async (username) =>{
  const query = {
    text: `
    SELECT * FROM users
    WHERE USERNAME = $1
    `,
    values: [username]
  }

  const {rows} = await db.query(query)
  return rows[0]
}

// Realizar soft delete de un usuario
const deleteUser = async (username) => {
  const query = {
    text: `
    UPDATE users
    SET deleted_at = NOW()
    WHERE username = $1
    RETURNING *
    `,
    values: [username]
  };

  const { rows } = await db.query(query);
  return rows[0];  // Retornar el usuario "eliminado"
};

// Actualizar usuario y modificar la columna updated_at
const updateUser = async (username, password) => {
  const query = {
    text: `
    UPDATE users
    SET password = $2, updated_at = NOW()
    WHERE username = $1 AND deleted_at IS NULL
    RETURNING *
    `,
    values: [username, password]
  };

  const { rows } = await db.query(query);
  return rows[0];  // Retornar el usuario actualizado
};

export const UserModel = {
  create,
  findUser,
  deleteUser,
  updateUser
};