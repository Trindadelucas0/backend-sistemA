/**
 * Middleware de autenticação (auth.js)
 * Responsável por verificar e validar o token JWT em requisições autenticadas.
 * Este middleware é aplicado em todas as rotas privadas.
 */

import jwt from 'jsonwebtoken';

// Chave secreta para assinatura e verificação dos tokens JWT
// Deve ser definida no arquivo .env
const jwt_secret = process.env.jwt_secret;

/**
 * Middleware de autenticação
 * Verifica se o token JWT está presente e é válido
 * 
 * Headers esperados:
 * - Authorization: Bearer <token>
 * 
 * Comportamento:
 * - Adiciona o usuário decodificado ao objeto req.user
 * - Permite a requisição continuar se o token for válido
 * - Retorna erro 401 se o token for inválido ou não fornecido
 */
const auth = (req, res, next) => {
  console.log("Middleware auth executado"); // Log para debug

  // Verifica se o cabeçalho de autorização está presente
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("Cabeçalho de autorização não encontrado");
    return res.status(401).json({ message: 'Acesso negado: Token não fornecido' });
  }

  // Verifica se o formato do token está correto (Bearer TOKEN)
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    console.log("Formato de token inválido");
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  // Verifica se o esquema de autenticação é "Bearer"
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    console.log("Esquema de autenticação inválido");
    return res.status(401).json({ message: 'Esquema de autenticação inválido' });
  }

  try {
    // Log parcial do token para debug (não loga o token completo por segurança)
    console.log("Token recebido:", token.substring(0, 10) + "...");
    
    // Verifica e decodifica o token
    const decode = jwt.verify(token, jwt_secret);
    console.log("Token decodificado:", decode);
    
    // Adiciona o usuário decodificado ao objeto req para uso nas rotas
    req.user = decode;
    next();
  } catch (err) {
    console.error("Erro ao verificar o token:", err);
    
    // Tratamento específico para token expirado
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    // Outros erros de token inválido
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export default auth;