import jwt from 'jsonwebtoken';

const jwt_secret = process.env.jwt_secret;

const auth = (req, res, next) => {
  //console.log("Middleware auth executado"); // Log para verificar se o middleware está sendo chamado

  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' });
  }

  try {
    const decode = jwt.verify(token.replace('Bearer ', ''), jwt_secret);
    console.log("Token decodificado:", decode); // Log para verificar o conteúdo do token
    req.user = decode; // Adiciona o usuário decodificado ao objeto `req` para uso posterior
  } catch (err) {
    console.error("Erro ao verificar o token:", err); // Log do erro
    return res.status(401).json({ message: 'Token inválido' });
  }

  next();
};

export default auth;