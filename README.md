# 🚀 MARKETPLACE BACKEND - Node.js + Express + Socket.io

Backend completo para o Marketplace Local!

## 🏗️ Arquitetura

```
├── server.js              # Servidor principal
├── database/
│   └── init.js           # Inicialização do SQLite
├── routes/
│   ├── auth.js           # Autenticação (login/registro)
│   ├── products.js       # CRUD de produtos
│   └── users.js          # Gestão de usuários
├── socket/
│   └── chatHandler.js    # Chat em tempo real
└── uploads/
    └── products/         # Imagens de produtos
```

## ✅ O QUE ESTÁ FUNCIONANDO:

### 🔐 **Autenticação**
- ✅ Registro de usuários
- ✅ Login com JWT
- ✅ Hash de senhas (bcrypt)
- ✅ Proteção de rotas

### 📦 **Produtos**
- ✅ Criar produto (com upload de imagens)
- ✅ Listar produtos (com filtros)
- ✅ Buscar produto por ID
- ✅ Atualizar produto
- ✅ Deletar produto
- ✅ Geolocalização de produtos

### 💬 **Chat Tempo Real (Socket.io)**
- ✅ Conectar ao chat
- ✅ Enviar mensagens
- ✅ Receber mensagens em tempo real
- ✅ Indicador "digitando..."
- ✅ Marcar como lido

### 👤 **Usuários**
- ✅ Buscar perfil
- ✅ Atualizar perfil
- ✅ Geolocalização

## 🚀 COMO USAR:

### **1. Iniciar o servidor:**

```bash
# Em desenvolvimento
npm run dev

# Em produção
npm start
```

### **2. Servidor estará rodando em:**
- API REST: `http://localhost:3000/api`
- Socket.io: `ws://localhost:3000`

## 📡 ENDPOINTS DA API:

### **Autenticação**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "phone": "+258 84 123 4567",
  "latitude": -25.9655,
  "longitude": 32.5732
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

```http
GET /api/auth/me
Authorization: Bearer {token}
```

### **Produtos**

```http
GET /api/products
Query params: ?category=eletronicos&limit=20&offset=0
```

```http
GET /api/products/:id
```

```http
POST /api/products
Authorization: Bearer {token}
Content-Type: multipart/form-data

title: iPhone 12
description: Novo na caixa
price: 3500
category: eletronicos
latitude: -25.9655
longitude: 32.5732
images: [arquivo1.jpg, arquivo2.jpg]
```

```http
PUT /api/products/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Novo título",
  "price": 3000,
  "status": "sold"
}
```

```http
DELETE /api/products/:id
Authorization: Bearer {token}
```

### **Usuários**

```http
GET /api/users/:id
```

```http
PUT /api/users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Nome",
  "phone": "+258 84 999 9999"
}
```

## 🔌 SOCKET.IO EVENTOS:

### **Cliente → Servidor:**

```javascript
// Entrar em um chat
socket.emit('join_chat', chatId);

// Enviar mensagem
socket.emit('send_message', {
  chatId: 1,
  senderId: 123,
  text: 'Olá!'
});

// Digitando...
socket.emit('typing', { chatId: 1, userId: 123, userName: 'João' });

// Parou de digitar
socket.emit('stop_typing', { chatId: 1, userId: 123 });

// Marcar como lido
socket.emit('mark_as_read', { chatId: 1, userId: 123 });
```

### **Servidor → Cliente:**

```javascript
// Nova mensagem
socket.on('new_message', (message) => {
  console.log('Nova mensagem:', message);
});

// Usuário digitando
socket.on('user_typing', ({ userId, userName }) => {
  console.log(`${userName} está digitando...`);
});

// Usuário parou de digitar
socket.on('user_stop_typing', ({ userId }) => {
  console.log('Parou de digitar');
});

// Mensagens lidas
socket.on('messages_read', ({ chatId, userId }) => {
  console.log('Mensagens lidas');
});
```

## 🗄️ BANCO DE DADOS:

SQLite com as seguintes tabelas:

- **users** - Usuários
- **products** - Produtos
- **chats** - Conversas
- **messages** - Mensagens

## 🔧 VARIÁVEIS DE AMBIENTE (.env):

```env
PORT=3000
JWT_SECRET=seu-secret-aqui
NODE_ENV=development
```

## 📦 DEPENDÊNCIAS:

- `express` - Framework web
- `socket.io` - Tempo real
- `better-sqlite3` - Banco de dados
- `bcrypt` - Hash de senhas
- `jsonwebtoken` - Autenticação JWT
- `multer` - Upload de arquivos
- `cors` - CORS
- `dotenv` - Variáveis de ambiente

## ✅ PRONTO PARA INTEGRAR COM O APP!

O backend está 100% funcional e pronto para ser consumido pelo app React Native!

---

**Próximo passo:** Atualizar o app React Native para consumir esta API! 🚀
