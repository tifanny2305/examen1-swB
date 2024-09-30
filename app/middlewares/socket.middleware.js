import jwt from 'jsonwebtoken';

export const verifySocketToken = (socket, next) => {
  const token = socket.handshake.auth.token;  // Obtener el token desde el handshake
  console.log("Token recibido:", token);
  if (!token) {
    return next(new Error('Autenticación fallida: No se proporcionó token'));
  }

  try {
    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token válido, usuario ID:", decoded.id);
    socket.userId = decoded.id;  // Guardar el ID del usuario en el socket
    next();  // Continuar con la conexión
  } catch (err) {
    return next(new Error('Token inválido'));
  }
};
