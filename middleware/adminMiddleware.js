const db = require('../database/init');

// Middleware para verificar se o usuário é admin
const verifyAdmin = (req, res, next) => {
  try {
    const userId = req.userId; // Vem do middleware verifyToken

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar usuário no banco
    const user = db.prepare('SELECT role, isBanned FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se está banido
    if (user.isBanned) {
      return res.status(403).json({ error: 'Usuário banido' });
    }

    // Verificar se é admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de admin:', error);
    return res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

module.exports = { verifyAdmin };
