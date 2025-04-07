/**
 * Arquivo de rotas privadas (private.js)
 * Contém as rotas que requerem autenticação.
 * Todas as rotas neste arquivo são protegidas pelo middleware de autenticação.
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from "../middlewares/auth.js";
import upload from '../utils/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Middleware para verificar se o usuário é administrador
 * Este middleware é usado em rotas que requerem privilégios de administrador
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar este recurso." });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Erro ao verificar permissões" });
  }
};

/**
 * Rota para listar todos os usuários
 * GET /usuarios
 * Requer autenticação e privilégios de administrador
 * 
 * Retorna:
 * - 200: Lista de usuários
 * - 403: Acesso negado (não é admin)
 * - 500: Erro no servidor
 */
router.get('/usuarios', auth, isAdmin, async (req, res) => {
  try {
    console.log("Iniciando busca de usuários...");
    console.log("ID do usuário autenticado:", req.user.id);
    console.log("Status de admin:", req.user.isAdmin);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        lastLogin: true,
        isAdmin: true
      }
    });

    console.log("Usuários encontrados:", users.length);
    res.status(200).json({ users });
  } catch (err) {
    console.error("Erro detalhado ao listar usuários:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ 
      message: "Erro ao buscar usuários",
      error: err.message 
    });
  }
});

/**
 * Rota para bloquear/desbloquear usuário
 * PUT /usuarios/:id/status
 * Requer autenticação e privilégios de administrador
 * 
 * Parâmetros:
 * - id: ID do usuário
 * Body:
 * - isBlocked: boolean (true para bloquear, false para desbloquear)
 * 
 * Retorna:
 * - 200: Status atualizado com sucesso
 * - 403: Acesso negado (não é admin)
 * - 500: Erro no servidor
 */
router.put('/usuarios/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true
      }
    });

    res.status(200).json({ 
      message: `Usuário ${isBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso`,
      user 
    });
  } catch (err) {
    console.error("Erro ao atualizar status do usuário:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

/**
 * Rota para listar registros de um usuário específico
 * GET /usuarios/:id/registros
 * Requer autenticação e privilégios de administrador
 * 
 * Parâmetros:
 * - id: ID do usuário
 * 
 * Retorna:
 * - 200: Lista de registros do usuário
 * - 403: Acesso negado (não é admin)
 * - 500: Erro no servidor
 */
router.get('/usuarios/:id/registros', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const registros = await prisma.registro.findMany({
      where: { userId: id },
      orderBy: { data: 'desc' }
    });
    res.status(200).json({ registros });
  } catch (err) {
    console.error("Erro ao listar registros do usuário:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

/**
 * Rota para criar um novo registro de ponto
 * POST /registro
 * Requer autenticação
 * 
 * Body:
 * - data: Data do registro (YYYY-MM-DD)
 * - tipoPonto: Tipo do registro (entrada, saida, almoco, retorno, intervalo_inicio, intervalo_fim)
 * - hora: Horário do registro (HH:MM)
 * - foto: Arquivo de imagem (opcional)
 * 
 * Retorna:
 * - 201: Registro criado com sucesso
 * - 400: Dados inválidos
 * - 500: Erro no servidor
 */
router.post("/registro", auth, upload.single('foto'), async (req, res) => {
  try {
    console.log("Recebendo requisição de registro:", req.body);
    console.log("Arquivo recebido:", req.file);
    console.log("Usuário autenticado:", req.user);
    
    const { data, tipoPonto, hora } = req.body;

    // Validação dos campos obrigatórios
    if (!data || !tipoPonto || !hora) {
      console.log("Dados incompletos:", { data, tipoPonto, hora });
      return res.status(400).json({ message: "Data, tipo e horário são obrigatórios" });
    }

    // Validação do formato da data
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) {
      console.log("Data inválida:", data);
      return res.status(400).json({ message: "Formato de data inválido" });
    }

    // Validação do tipo de ponto
    const tiposValidos = ['entrada', 'saida', 'almoco', 'retorno', 'intervalo_inicio', 'intervalo_fim'];
    if (!tiposValidos.includes(tipoPonto)) {
      console.log("Tipo de ponto inválido:", tipoPonto);
      return res.status(400).json({ message: "Tipo de ponto inválido" });
    }

    // Validação do formato da hora
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(hora)) {
      console.log("Formato de hora inválido:", hora);
      return res.status(400).json({ message: "Formato de hora inválido (use HH:MM)" });
    }

    // Processamento da foto
    let fotoURL = null;
    if (req.file) {
      fotoURL = `/public/imagens/${req.file.filename}`;
    }

    console.log("Criando registro com dados:", {
      userId: req.user.id,
      data: dataObj,
      tipoPonto,
      hora,
      foto: fotoURL
    });

    // Criação do registro no banco de dados
    const registro = await prisma.registro.create({
      data: {
        userId: req.user.id,
        data: dataObj,
        tipoPonto,
        hora,
        foto: fotoURL ? [fotoURL] : []
      }
    });

    console.log("Registro criado com sucesso:", registro);
    res.status(201).json({ registro });
  } catch (err) {
    console.error("Erro ao criar registro:", err);
    res.status(500).json({ message: "Erro no servidor", error: err.message });
  }
});

/**
 * Rota para listar registros do usuário autenticado
 * GET /registros
 * Requer autenticação
 * 
 * Retorna:
 * - 200: Lista de registros do usuário
 * - 500: Erro no servidor
 */
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

/**
 * Rota para atualizar um registro existente
 * PUT /registro/:id
 * Requer autenticação
 * 
 * Parâmetros:
 * - id: ID do registro
 * Body:
 * - data: Nova data (opcional)
 * - tipoPonto: Novo tipo (opcional)
 * - hora: Nova hora (opcional)
 * - foto: Novas fotos (opcional)
 * 
 * Retorna:
 * - 200: Registro atualizado com sucesso
 * - 400: Dados inválidos
 * - 404: Registro não encontrado
 * - 500: Erro no servidor
 */
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
      // Validação da data
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

/**
 * Rota para deletar um registro
 * DELETE /registro/:id
 * Requer autenticação
 * 
 * Parâmetros:
 * - id: ID do registro
 * 
 * Retorna:
 * - 200: Registro deletado com sucesso
 * - 404: Registro não encontrado
 * - 500: Erro no servidor
 */
router.delete("/registro/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o registro existe
    const registro = await prisma.registro.findUnique({
      where: { id: String(id) },
    });

    if (!registro) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }

    // Verifica se o registro pertence ao usuário
    if (registro.userId !== req.user.id) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Deleta o registro
    await prisma.registro.delete({
      where: { id: String(id) },
    });

    res.status(200).json({ message: "Registro deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar registro:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
});

export default router;