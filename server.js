/**
 * Arquivo principal do servidor (server.js)
 * Este é o ponto de entrada da aplicação, responsável por configurar o servidor Express
 * e definir as rotas da aplicação.
 */

import express from "express";
import cors from "cors";
import { config } from "dotenv";
import publicas from "./routes/publicas.js";
import privat from "./routes/private.js";
import auth from "./middlewares/auth.js";
import uploadRoutes from "./routes/upload.js";

config();
// Inicialização do aplicativo Express
const app = express();

// Configuração do CORS para permitir requisições de diferentes origens
app.use(cors());

// Configuração para processar JSON e dados codificados em URL
// Limite de 10MB para evitar sobrecarga do servidor
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rotas públicas (não requerem autenticação)
// Inclui endpoints como login e cadastro
app.use("/", publicas);

// Rotas privadas (requerem autenticação)
// O middleware 'auth' verifica o token JWT antes de permitir o acesso
app.use("/", auth, privat);

// Rota de upload de imagens
app.use("/api", uploadRoutes);

// Configuração para servir arquivos estáticos
app.use('/public', express.static('public'));

// Inicialização do servidor na porta 3000
app.listen(3000, () =>
  console.log("**** Servidor Rodando na porta 3000 *****")
);

// Nota: As credenciais do banco de dados devem ser mantidas no arquivo .env
// e nunca devem ser commitadas no repositório

//mongodb+srv://atlas-sample-dataset-load-67e34e52d329fa5b694975f0:<db_password>@sistema-ponto.solp6nb.mongodb.net/?retryWrites=true&w=majority&appName=sistema-ponto
//lucasrodrigues4
