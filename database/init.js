  const Database = require('better-sqlite3');
const path = require('path');

// Criar ou abrir banco de dados SQLite
const db = new sqlite3.Database(path.join(__dirname, 'marketplace.db'), (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
  } else {
    console.log('Banco SQLite conectado com sucesso.');
  }
});



// Criar tabelas
db.exec(`
  -- Tabela de usuários
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    latitude REAL,
    longitude REAL,
    role TEXT DEFAULT 'user',
    isBanned INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  -- Tabela de produtos
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    images TEXT,
    category TEXT,
    sellerId INTEGER NOT NULL,
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'available',
    approvalStatus TEXT DEFAULT 'approved',
    createdAt TEXT NOT NULL,
    updatedAt TEXT,
    FOREIGN KEY(sellerId) REFERENCES users(id)
  );

  -- Tabela de chats
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId1 INTEGER NOT NULL,
    userId2 INTEGER NOT NULL,
    productId INTEGER,
    lastMessage TEXT,
    lastMessageAt TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId1) REFERENCES users(id),
    FOREIGN KEY(userId2) REFERENCES users(id),
    FOREIGN KEY(productId) REFERENCES products(id)
  );

  -- Tabela de mensagens
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    text TEXT,
    image TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(chatId) REFERENCES chats(id),
    FOREIGN KEY(senderId) REFERENCES users(id)
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_products_seller ON products(sellerId);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  CREATE INDEX IF NOT EXISTS idx_products_approval ON products(approvalStatus);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chatId);
  CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(userId1, userId2);
`);

console.log('✅ Banco de dados SQLite inicializado');

module.exports = db;
