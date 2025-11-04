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
    const hashedPassword = bcrypt.hashSync(password, 10);

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
    console.log('Tentativa de login para:', email);

    // Validações
    if (!email || !password) {
      console.log('Email ou senha não fornecidos');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário com todos os campos, incluindo password
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    
    console.log('Usuário encontrado no banco de dados:', JSON.stringify(user, null, 2));
    
    if (!user.password) {
      console.error('Erro: O usuário não tem senha definida no banco de dados');
      return res.status(500).json({ 
        error: 'Erro de configuração do usuário',
        details: 'O usuário não tem uma senha definida' 
      });
    }

    // Verificar se está banido
    if (user.isBanned) {
      console.log('Usuário banido tentou fazer login:', email);
      return res.status(403).json({ error: 'Usuário banido. Entre em contato com o suporte.' });
    }

    console.log('Usuário encontrado, verificando senha...');
    
    try {
      // Verificar senha
      console.log('Verificando senha para o usuário:', email);
      console.log('Senha fornecida:', password);
      console.log('Hash armazenado:', user.password);
      
      try {
        const validPassword = bcrypt.compareSync(password, user.password);
        console.log('Resultado da comparação de senha:', validPassword);
        
        if (!validPassword) {
          console.log('Senha inválida para o usuário:', email);
          return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
      } catch (error) {
        console.error('Erro ao comparar as senhas:', error);
        return res.status(500).json({ 
          error: 'Erro ao processar a autenticação',
          details: error.message 
        });
      }

      // Gerar token JWT
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

      // Remover senha da resposta
      const userResponse = { ...user };
      delete userResponse.password;

      console.log('Login bem-sucedido para:', email);
      
      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: userResponse
      });
    } catch (hashError) {
      console.error('Erro ao verificar senha:', hashError);
      return res.status(500).json({ 
        error: 'Erro ao processar a autenticação',
        details: hashError.message 
      });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      error: 'Erro ao fazer login',
      details: error.message 
    });
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
