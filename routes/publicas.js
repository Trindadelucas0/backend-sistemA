import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = express.Router(); // Use "router" minúsculo por convenção
const prisma = new PrismaClient();
const jwt_secret = process.env.jwt_secret

// Rota de cadastro
router.post("/cadastro", async (req, res) => {
  try{
  const user = req.body;
  const salt= await bcrypt.genSalt(10)
  const hashPassword = await bcrypt.hash(user.password,salt)
 const userDb = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashPassword
      },
    });

  res.status(201).json(userDb);
}catch(err){
  res.status(500).json({message:"erro no servidor tente novamente"})
}
});

//rota login usando o jwt
router.post('/login', async (req, res) => {
  try {
    const userInfo = req.body;
    

    // Verifica se o usuário existe no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: userInfo.email }
    });
    
    //verifica se usuario existe no banco de dados
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }


    // compara a senha do banco com a que o usuario digitou
    const validaSenha = await bcrypt.compare(userInfo.password, user.password);
    if (!validaSenha) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    // Retorna sucesso (aqui você pode gerar um token JWT, se necessário)
    const token =jwt.sign({id: user.id},jwt_secret,{expiresIn: "1m"})








    res.status(200).json(token)





  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ message: "Erro no servidor, tente novamente" });
  }
});

export default router; // Exporte o "router" que você criou
