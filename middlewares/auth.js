import jwt from 'jsonwebtoken';

const jwt_secret = process.env.jwt_secret;

const auth = (req, res, next) => {
  //console.log("Middleware auth executado"); // Log para verificar se o middleware está sendo chamado

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Verifica se o formato do token está correto
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Formato de token inválido' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verifica se o token está vazio
    if (!token) {
      return res.status(401).json({ message: 'Token vazio' });
    }

    // Verifica se o token é válido
    const decoded = jwt.verify(token, jwt_secret);

    // Verifica se o token contém as informações necessárias
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Token malformado' });
    }

    // Adiciona o usuário decodificado ao objeto req
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Erro na autenticação:", err);
    
    // Tratamento específico para diferentes tipos de erro
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export default auth;