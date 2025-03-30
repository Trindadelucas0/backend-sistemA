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
app.listen(3000, () => console.log('**** Servidor Rodando na porta 3000 *****'));

//mongodb+srv://atlas-sample-dataset-load-67e34e52d329fa5b694975f0:<db_password>@sistema-ponto.solp6nb.mongodb.net/?retryWrites=true&w=majority&appName=sistema-ponto
//lucasrodrigues4