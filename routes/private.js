import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from "../middlewares/auth.js";

const router = express.Router();
const prisma = new PrismaClient();

// Listar todos os usuários (apenas para admin)
router.get('/listar-usuarios', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    res.status(200).json({ users });
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

// Criar registro
router.post("/registro", auth, async (req, res) => {
  try {
    const { data, tipoPonto, hora, foto } = req.body;

    // Validação
    if (!data || !tipoPonto || !hora) {
      return res.status(400).json({ message: "Data, tipo e horário são obrigatórios" });
    }

    // Cria o registro
    const registro = await prisma.registro.create({
      data: {
        userId: req.user.id,
        data: new Date(data),
        tipoPonto,
        hora,
        foto: Array.isArray(foto) ? foto : [foto].filter(Boolean)
      }
    });

    res.status(201).json({ registro });
  } catch (err) {
    console.error("Erro ao criar registro:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

// Listar registros do usuário
router.get("/registros", auth, async (req, res) => {
  try {
    const registros = await prisma.registro.findMany({
      where: { userId: req.user.id },
      orderBy: { data: 'desc' }
    });
    res.status(200).json({ registros });
  } catch (err) {
    console.error("Erro ao listar registros:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

// Atualizar registro
router.put("/registro/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, tipoPonto, hora, foto } = req.body;

    console.log("Dados recebidos para atualização:", { data, tipoPonto, hora, foto });

    // Verifica se o registro existe e pertence ao usuário
    const registro = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registro || registro.userId !== req.user.id) {
      return res.status(404).json({ message: "Registro não encontrado ou acesso negado" });
    }

    // Prepara os dados para atualização
    const updateData = {};

    if (data) {
      // Validação robusta da data
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) {
        return res.status(400).json({ message: "Data inválida. Use o formato YYYY-MM-DD." });
      }
      updateData.data = dataObj;
    }

    if (tipoPonto) {
      updateData.tipoPonto = tipoPonto;
    }

    if (hora) {
      updateData.hora = hora;
    }

    if (foto) {
      updateData.foto = Array.isArray(foto) ? foto : [foto];
    }

    console.log("Dados preparados para atualização:", updateData);

    // Atualiza o registro no banco de dados
    const registroAtualizado = await prisma.registro.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ 
      message: "Registro atualizado com sucesso", 
      registro: registroAtualizado 
    });
  } catch (err) {
    console.error("Erro ao atualizar registro:", err);
    res.status(500).json({ message: "Erro no servidor", error: err.message });
  }
});

// Deletar registro (versão corrigida)
router.delete("/registro/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o registro existe e pertence ao usuário
    const registro = await prisma.registro.findUnique({
      where: { id },
    });

    if (!registro) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    if (registro.userId !== req.user.id) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Remove o registro
    await prisma.registro.delete({
      where: { id },
    });

    res.status(200).json({ message: "Registro removido com sucesso" });
  } catch (err) {
    console.error("Erro ao remover registro:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

export default router;