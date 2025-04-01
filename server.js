import express from 'express';
import cors from 'cors';
import publicas from './routes/publicas.js';
import privat from './routes/private.js';
import auth from './middlewares/auth.js';

const app = express();

// Configuração do CORS
app.use(cors());

// Configuração para processar JSON e URL-encoded com limite de 10 MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rotas públicas (não requerem autenticação)
app.use('/', publicas);

// Middleware de autenticação
app.use(auth);

// Rotas privadas (requerem autenticação)
app.use('/', privat);

// Inicialização do servidor
app.listen(3000, () => console.log(`
    \x1b[36m
    ██████╗  ██████╗ ███╗   ██╗████████╗ ██████╗ 
    ██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔═══██╗
    ██████╔╝██║   ██║██╔██╗ ██║   ██║   ██║   ██║
    ██╔═══╝ ██║   ██║██║╚██╗██║   ██║   ██║   ██║
    ██║     ╚██████╔╝██║ ╚████║   ██║   ╚██████╔╝
    ╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝    ╚═════╝ 
    \x1b[0m
    \x1b[33m
    ===========================================
    🚀  SISTEMA DE REGISTRO DE PONTO - v2.0
    ===========================================
    \x1b[32m
    ✔ Servidor rodando na porta: \x1b[1m3000\x1b[0m
    ✔ Ambiente: \x1b[1m${process.env.NODE_ENV || 'desenvolvimento'}\x1b[0m
    ✔ Iniciado em: \x1b[1m${new Date().toLocaleString('pt-BR')}\x1b[0m
    
    \x1b[36m► \x1b[35mRegistro de entradas/saídas
    \x1b[36m► \x1b[35mCálculo de horas trabalhadas
    \x1b[36m► \x1b[35mRelatórios completos
    
    
    \x1b[33m
    -------------------------------------------
    👨‍💻 Desenvolvedor: Lucas Rodrigues da Trindade
    ===========================================
    \x1b[0m
    `));
//mongodb+srv://atlas-sample-dataset-load-67e34e52d329fa5b694975f0:<db_password>@sistema-ponto.solp6nb.mongodb.net/?retryWrites=true&w=majority&appName=sistema-ponto
//lucasrodrigues4