const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');

// Buscar usuário por ID
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, phone, avatar, latitude, longitude FROM users WHERE id = ?')
      .get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Atualizar perfil (protegido)
router.put('/me', verifyToken, (req, res) => {
  try {
    const { name, phone, latitude, longitude } = req.body;

    db.prepare(`
      UPDATE users 
      SET name = ?, phone = ?, latitude = ?, longitude = ?, updatedAt = ?
      WHERE id = ?
    `).run(name, phone, latitude, longitude, new Date().toISOString(), req.userId);

    const user = db.prepare('SELECT id, name, email, phone, avatar, latitude, longitude FROM users WHERE id = ?')
      .get(req.userId);

    res.json({
      message: 'Perfil atualizado com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
