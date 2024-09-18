import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ ok: false, msg: 'Token no proporcionado' });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);  // Usamos el secreto definido en .env
    req.user = decoded;  // Guardar la información decodificada en la solicitud para usarla en las rutas protegidas
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, msg: 'Token inválido' });
  }
};
