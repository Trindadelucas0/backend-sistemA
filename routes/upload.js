import express from 'express';
import { PrismaClient } from '@prisma/client';
import upload from '../../utils/upload.js';

const router = express.Router();
const prisma = new PrismaClient();

// Rota para upload de imagem
router.post('/upload-imagem', upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhuma imagem foi enviada' });
    }

    const imagemURL = `/public/imagens/${req.file.filename}`;
    
    // Aqui você pode adicionar a lógica para salvar no Oracle
    // Por enquanto, vamos apenas retornar a URL da imagem
    res.json({ 
      mensagem: 'Imagem enviada com sucesso',
      imagemURL: imagemURL
    });
  } catch (erro) {
    console.error('Erro no upload:', erro);
    res.status(500).json({ erro: 'Erro ao processar o upload da imagem' });
  }
});

export default router; 