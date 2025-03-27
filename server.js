import express from 'express';
import publicas from './routes/publicas.js';
import privat from './routes/private.js';
import auth from './middlewares/auth.js';
import cors from 'cors';

const app = express();

// Configuração do CORS
app.use(cors());

app.use(express.json());

// Rotas públicas (login e cadastro)
app.use('/', publicas);

// Middleware de autenticação (aplicado antes das rotas privadas)
app.use(auth);

// Rotas privadas (listar usuários)
app.use('/', privat);

app.listen(3000, () => console.log('**** Servidor Rodando *****'));


//mongodb+srv://atlas-sample-dataset-load-67e34e52d329fa5b694975f0:<db_password>@sistema-ponto.solp6nb.mongodb.net/?retryWrites=true&w=majority&appName=sistema-ponto
//lucasrodrigues4