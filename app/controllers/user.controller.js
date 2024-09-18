import { UserModel } from '../models/user.models.js';
import bcrypt from 'bcryptjs';  // Para el hashing de la contraseña
import jwt from 'jsonwebtoken';  // Para generar tokens JWT

// POST '/api/register'
const register = async (req, res) => {
  try {
    console.log(req.body)
    const {username, password} = req.body

    //validaciones
    if(!username || !password){
      return res.status(400).json({ ok: false, msg: "falta el dato username" })
    }

    const user = await UserModel.findUser(username)
    if(user){
      return res.status(409).json({ ok: false, msg: "username existe" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPass = await bcrypt.hash(password, salt)
    const newUser = await UserModel.create(username, hashedPass);

    // Generar el token JWT para el nuevo usuario
    const token = jwt.sign({ id: newUser.id, username: newUser.username }, 
      process.env.JWT_SECRET, {
      expiresIn: '1h' 
    });

    // Retornar el token junto con el registro exitoso
    return res.status(201).json({
      ok: true,
      msg: "Usuario registrado exitosamente",
      user: { id: newUser.id, username: newUser.username },
      token  
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({
      ok: false,
      msg: 'error server'
    })
  }
}

// POST '/api/login'
const login = async (req, res) => {
  try {
    console.log(req.body)
    const {username, password} = req.body

    // Validar si el usuario existe
    const user = await UserModel.findUser(username);
    if (!user) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    // Validar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, msg: 'Contraseña incorrecta' });
    }

    // Crear el JWT 
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '1h'  
    });

    // Enviar el token al cliente
    return res.json({
      ok: true,
      msg: 'Login exitoso',
      token  
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({
      ok: false,
      msg: 'error server'
    })
  }
}

// POST '/api/delete' (soft delete)
/*const deleteUser = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ ok: false, msg: "Falta el username" });
    }

    const user = await UserModel.deleteUser(username);
    if (!user) {
      return res.status(404).json({ ok: false, msg: "Usuario no encontrado o ya eliminado" });
    }

    return res.status(200).json({ ok: true, msg: "Usuario eliminado correctamente", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      msg: 'Error del servidor'
    });
  }
};*/

const profile = async (req, res) => {
  try {
    // req.user ya contiene la información del usuario del token JWT
    const user = await UserModel.findUser(req.user.username);

    if (!user) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    // Retornar la información del perfil
    return res.status(200).json({
      ok: true,
      msg: 'Perfil del usuario',
      user: { id: user.id, username: user.username }  // Aquí puedes devolver más información si la tienes
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, msg: 'Error del servidor' });
  }
};

export const UserController = {
  register,
  login,
  profile
}
