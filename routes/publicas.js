import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();
const prisma = new PrismaClient();
const jwt_secret = process.env.jwt_secret;

// Rota de cadastro
router.post("/cadastro", async (req, res) => {
  try {
    console.log("Dados recebidos no cadastro:", req.body);

    const user = req.body;

    // Validação básica
    if (!user.name || !user.email || !user.password) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    // Verifica se o e-mail já está cadastrado
    const userExists = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (userExists) {
      return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(user.password, salt);

    // Cria o usuário no banco de dados
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

// Rota de login usando o JWT
router.post("/login", async (req, res) => {
  try {
    const userInfo = req.body;

    // Verifica se o usuário existe no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Compara a senha fornecida com a senha armazenada no banco
    const validaSenha = await bcrypt.compare(userInfo.password, user.password);
    if (!validaSenha) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    // Gera o token JWT
    const token = jwt.sign({ id: user.id }, jwt_secret, { expiresIn: "1h" });

    console.log("Token gerado:", token);
    res.status(200).json({ token });
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente" });
  }
});

export default router;