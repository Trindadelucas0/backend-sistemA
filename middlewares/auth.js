import jwt from 'jsonwebtoken';

const jwt_secret = process.env.jwt_secret;

const auth = (req, res, next) => {
  console.log("Middleware auth executado"); // Log para verificar se o middleware está sendo chamado

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("Cabeçalho de autorização não encontrado");
    return res.status(401).json({ message: 'Acesso negado: Token não fornecido' });
  }

  // Verificar se o formato do token está correto (Bearer TOKEN)
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    console.log("Formato de token inválido");
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    console.log("Esquema de autenticação inválido");
    return res.status(401).json({ message: 'Esquema de autenticação inválido' });
  }

  try {
    console.log("Token recebido:", token.substring(0, 10) + "...");
    const decode = jwt.verify(token, jwt_secret);
    console.log("Token decodificado:", decode); // Log para verificar o conteúdo do token
    req.user = decode; // Adiciona o usuário decodificado ao objeto `req` para uso posterior
    next();
  } catch (err) {
    console.error("Erro ao verificar o token:", err); // Log do erro
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export default auth;