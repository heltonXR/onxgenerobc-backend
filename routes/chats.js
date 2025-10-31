const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');

// Listar chats do usuário
router.get('/', verifyToken, (req, res) => {
  try {
    const userId = req.userId;

    const chats = db.prepare(`
      SELECT 
        c.*,
        CASE 
          WHEN c.userId1 = ? THEN u2.name 
          ELSE u1.name 
        END as otherUserName,
        CASE 
          WHEN c.userId1 = ? THEN u2.avatar 
          ELSE u1.avatar 
        END as otherUserAvatar,
        CASE 
          WHEN c.userId1 = ? THEN c.userId2 
          ELSE c.userId1 
        END as otherUserId,
        p.title as productTitle,
        (SELECT COUNT(*) FROM messages WHERE chatId = c.id AND senderId != ? AND isRead = 0) as unreadCount
      FROM chats c
      LEFT JOIN users u1 ON c.userId1 = u1.id
      LEFT JOIN users u2 ON c.userId2 = u2.id
      LEFT JOIN products p ON c.productId = p.id
      WHERE c.userId1 = ? OR c.userId2 = ?
      ORDER BY c.lastMessageAt DESC
    `).all(userId, userId, userId, userId, userId, userId);

    res.json({ chats });
  } catch (error) {
    console.error('Erro ao listar chats:', error);
    res.status(500).json({ error: 'Erro ao listar chats' });
  }
});

// Buscar ou criar chat
router.post('/find-or-create', verifyToken, (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId, productId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId é obrigatório' });
    }

    // Verificar se já existe chat entre esses usuários
    let chat = db.prepare(`
      SELECT * FROM chats 
      WHERE (userId1 = ? AND userId2 = ?) 
         OR (userId1 = ? AND userId2 = ?)
      ${productId ? 'AND productId = ?' : ''}
    `).get(
      userId, otherUserId, 
      otherUserId, userId,
      ...(productId ? [productId] : [])
    );

    // Se não existe, criar novo chat
    if (!chat) {
      const result = db.prepare(`
        INSERT INTO chats (userId1, userId2, productId, createdAt)
        VALUES (?, ?, ?, ?)
      `).run(userId, otherUserId, productId || null, new Date().toISOString());

      chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(result.lastInsertRowid);
    }

    // Buscar informações do outro usuário
    const otherUser = db.prepare(`
      SELECT id, name, avatar FROM users WHERE id = ?
    `).get(otherUserId);

    res.json({ 
      chat,
      otherUser 
    });
  } catch (error) {
    console.error('Erro ao buscar/criar chat:', error);
    res.status(500).json({ error: 'Erro ao buscar/criar chat' });
  }
});

// Buscar mensagens de um chat
router.get('/:chatId/messages', verifyToken, (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;

    let query = `
      SELECT m.*, u.name as senderName, u.avatar as senderAvatar
      FROM messages m
      LEFT JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ?
    `;

    const params = [chatId];

    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }

    query += ' ORDER BY m.createdAt DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = db.prepare(query).all(...params);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Deletar chat
router.delete('/:chatId', verifyToken, (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Verificar se o usuário faz parte do chat
    const chat = db.prepare(`
      SELECT * FROM chats 
      WHERE id = ? AND (userId1 = ? OR userId2 = ?)
    `).get(chatId, userId, userId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    // Deletar mensagens
    db.prepare('DELETE FROM messages WHERE chatId = ?').run(chatId);
    
    // Deletar chat
    db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);

    res.json({ message: 'Chat deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar chat:', error);
    res.status(500).json({ error: 'Erro ao deletar chat' });
  }
});

module.exports = router;
