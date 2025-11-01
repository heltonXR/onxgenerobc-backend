const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-aqui-mude-em-producao';

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, latitude, longitude } = req.body;

    // Validações
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    // Verificar se email já existe
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir usuário
    const result = db.prepare(`
      INSERT INTO users (email, password, name, phone, latitude, longitude, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, hashedPassword, name, phone || null, latitude || null, longitude || null, new Date().toISOString());

    // Gerar token JWT
    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });

    // Buscar usuário criado
    const user = db.prepare('SELECT id, email, name, phone, avatar, latitude, longitude FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validações
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Verificar se está banido
    if (user.isBanned) {
      return res.status(403).json({ error: 'Usuário banido. Entre em contato com o suporte.' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Gerar token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    // Remover senha da resposta
    delete user.password;

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Rota protegida de teste
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, avatar, latitude, longitude, role FROM users WHERE id = ?')
    .get(req.userId);

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  res.json(user);
});

module.exports = router;
module.exports.verifyToken = verifyToken;
