/**
 * Arquivo de rotas públicas (publicas.js)
 * Contém as rotas que não requerem autenticação, como login e cadastro.
 * Estas rotas são acessíveis a qualquer usuário.
 */

import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();
const jwt_secret = process.env.jwt_secret;

/**
 * Rota de cadastro de usuários
 * POST /cadastro
 * 
 * Requer no body:
 * - name: Nome do usuário
 * - email: Email do usuário (deve ser único)
 * - password: Senha do usuário (será criptografada)
 * 
 * Retorna:
 * - 201: Usuário criado com sucesso
 * - 400: Dados inválidos ou email já cadastrado
 * - 500: Erro no servidor
 */
router.post("/cadastro", async (req, res) => {
  try {
    console.log("Dados recebidos no cadastro:", req.body);

    const user = req.body;

    // Validação básica dos campos obrigatórios
    if (!user.name || !user.email || !user.password) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    // Verifica se o e-mail já está cadastrado para evitar duplicatas
    const userExists = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (userExists) {
      return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    // Criptografa a senha usando bcrypt com salt de 10 rounds
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(user.password, salt);

    // Cria o usuário no banco de dados com a senha criptografada
    const userDb = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashPassword,
      },
    });

    console.log("Usuário cadastrado com sucesso:", userDb);
    res.status(201).json({ message: "Usuário cadastrado com sucesso", user: userDb });
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente" });
  }
});

/**
 * Rota de login
 * POST /login
 * 
 * Requer no body:
 * - email: Email do usuário
 * - password: Senha do usuário
 * 
 * Retorna:
 * - 200: Login bem sucedido (token JWT + dados do usuário)
 * - 401: Senha inválida
 * - 403: Usuário bloqueado
 * - 404: Usuário não encontrado
 * - 500: Erro no servidor
 */
router.post("/login", async (req, res) => {
  try {
    const userInfo = req.body;

    // Busca o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verifica se o usuário está bloqueado
    if (user.isBlocked) {
      return res.status(403).json({ message: "Usuário bloqueado. Entre em contato com o administrador." });
    }

    // Compara a senha fornecida com a senha armazenada
    const validaSenha = await bcrypt.compare(userInfo.password, user.password);
    if (!validaSenha) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    // Verifica se é o primeiro usuário do sistema
    // Se for, torna automaticamente admin
    const totalUsers = await prisma.user.count();
    if (totalUsers === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true }
      });
      user.isAdmin = true;
    }

    // Atualiza o timestamp do último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Gera o token JWT com expiração de 1 hora
    const token = jwt.sign({ 
      id: user.id,
      isAdmin: user.isAdmin 
    }, jwt_secret, { expiresIn: "1h" });

    // Retorna o token e os dados do usuário
    res.status(200).json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente" });
  }
});

export default router;