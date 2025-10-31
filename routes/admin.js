const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');
const { verifyAdmin } = require('../middleware/adminMiddleware');

// Todas as rotas requerem autenticação e permissão de admin
router.use(verifyToken);
router.use(verifyAdmin);

// ==================== DASHBOARD ====================

// Estatísticas gerais
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      pendingProducts: db.prepare("SELECT COUNT(*) as count FROM products WHERE approvalStatus = 'pending'").get().count,
      approvedProducts: db.prepare("SELECT COUNT(*) as count FROM products WHERE approvalStatus = 'approved'").get().count,
      rejectedProducts: db.prepare("SELECT COUNT(*) as count FROM products WHERE approvalStatus = 'rejected'").get().count,
      bannedUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE isBanned = 1').get().count,
      totalChats: db.prepare('SELECT COUNT(*) as count FROM chats').get().count,
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ==================== GESTÃO DE PRODUTOS ====================

// Listar produtos pendentes de aprovação
router.get('/products/pending', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT 
        p.*,
        u.name as sellerName,
        u.email as sellerEmail
      FROM products p
      LEFT JOIN users u ON p.sellerId = u.id
      WHERE p.approvalStatus = 'pending'
      ORDER BY p.createdAt DESC
    `).all();

    // Parse images JSON
    products.forEach(product => {
      product.images = product.images ? JSON.parse(product.images) : [];
    });

    res.json({ products });
  } catch (error) {
    console.error('Erro ao listar produtos pendentes:', error);
    res.status(500).json({ error: 'Erro ao listar produtos pendentes' });
  }
});

// Listar todos os produtos (com filtro)
router.get('/products', (req, res) => {
  try {
    const { approvalStatus, limit = 100 } = req.query;

    let query = `
      SELECT 
        p.*,
        u.name as sellerName,
        u.email as sellerEmail
      FROM products p
      LEFT JOIN users u ON p.sellerId = u.id
    `;

    const params = [];

    if (approvalStatus) {
      query += ' WHERE p.approvalStatus = ?';
      params.push(approvalStatus);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ?';
    params.push(parseInt(limit));

    const products = db.prepare(query).all(...params);

    // Parse images JSON
    products.forEach(product => {
      product.images = product.images ? JSON.parse(product.images) : [];
    });

    res.json({ products });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Aprovar produto
router.put('/products/:id/approve', (req, res) => {
  try {
    const { id } = req.params;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    db.prepare(`
      UPDATE products 
      SET approvalStatus = 'approved', updatedAt = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    res.json({ message: 'Produto aprovado com sucesso' });
  } catch (error) {
    console.error('Erro ao aprovar produto:', error);
    res.status(500).json({ error: 'Erro ao aprovar produto' });
  }
});

// Rejeitar produto
router.put('/products/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    db.prepare(`
      UPDATE products 
      SET approvalStatus = 'rejected', updatedAt = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    res.json({ 
      message: 'Produto rejeitado',
      reason: reason || 'Não especificado'
    });
  } catch (error) {
    console.error('Erro ao rejeitar produto:', error);
    res.status(500).json({ error: 'Erro ao rejeitar produto' });
  }
});

// Deletar produto
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// ==================== GESTÃO DE USUÁRIOS ====================

// Listar todos os usuários
router.get('/users', (req, res) => {
  try {
    const { role, isBanned, limit = 100 } = req.query;

    let query = `
      SELECT 
        id, email, name, phone, role, isBanned, createdAt,
        (SELECT COUNT(*) FROM products WHERE sellerId = users.id) as totalProducts,
        (SELECT COUNT(*) FROM products WHERE sellerId = users.id AND approvalStatus = 'pending') as pendingProducts
      FROM users
      WHERE 1=1
    `;

    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (isBanned !== undefined) {
      query += ' AND isBanned = ?';
      params.push(isBanned === 'true' ? 1 : 0);
    }

    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(parseInt(limit));

    const users = db.prepare(query).all(...params);

    res.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Banir usuário
router.put('/users/:id/ban', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Não pode banir a si mesmo
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Você não pode banir a si mesmo' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não pode banir outro admin
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível banir outro administrador' });
    }

    db.prepare('UPDATE users SET isBanned = 1, updatedAt = ? WHERE id = ?')
      .run(new Date().toISOString(), id);

    res.json({ 
      message: 'Usuário banido com sucesso',
      reason: reason || 'Não especificado'
    });
  } catch (error) {
    console.error('Erro ao banir usuário:', error);
    res.status(500).json({ error: 'Erro ao banir usuário' });
  }
});

// Desbanir usuário
router.put('/users/:id/unban', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    db.prepare('UPDATE users SET isBanned = 0, updatedAt = ? WHERE id = ?')
      .run(new Date().toISOString(), id);

    res.json({ message: 'Usuário desbanido com sucesso' });
  } catch (error) {
    console.error('Erro ao desbanir usuário:', error);
    res.status(500).json({ error: 'Erro ao desbanir usuário' });
  }
});

// Deletar usuário
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Não pode deletar a si mesmo
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não pode deletar outro admin
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível deletar outro administrador' });
    }

    // Deletar produtos do usuário
    db.prepare('DELETE FROM products WHERE sellerId = ?').run(id);

    // Deletar chats do usuário
    db.prepare('DELETE FROM chats WHERE userId1 = ? OR userId2 = ?').run(id, id);

    // Deletar usuário
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'Usuário e seus dados deletados com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// Promover usuário a admin
router.put('/users/:id/promote', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    db.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?')
      .run('admin', new Date().toISOString(), id);

    res.json({ message: 'Usuário promovido a administrador' });
  } catch (error) {
    console.error('Erro ao promover usuário:', error);
    res.status(500).json({ error: 'Erro ao promover usuário' });
  }
});

module.exports = router;
