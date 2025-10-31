require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const adminRoutes = require('./routes/admin');

// Importar handlers do Socket.io
const chatHandler = require('./socket/chatHandler');

// Inicializar banco de dados
const db = require('./database/init');

const app = express();
const server = http.createServer(app);

// Configurar Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Em produção, especifique o domínio do app
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads de imagens)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 NhongaStore Backend funcionando!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      users: '/api/users'
    }
  });
});

// Socket.io - Chat em tempo real
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  // Handler de chat
  chatHandler(io, socket);
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Porta do servidor
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 NHONGASTORE BACKEND INICIADO!        ║
╠═══════════════════════════════════════════╣
║   Servidor rodando na porta: ${PORT}         ║
║   API REST: http://localhost:${PORT}/api    ║
║   Socket.io: ws://localhost:${PORT}         ║
╚═══════════════════════════════════════════╝
  `);
});
