const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { verifyToken } = require('./auth');
const multer = require('multer');
const path = require('path');

// Configurar upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens são permitidas!'));
  }
});

// Listar todos os produtos (com filtros opcionais)
router.get('/', (req, res) => {
  try {
    const { category, sellerId, status, limit = 50, offset = 0 } = req.query;

    // Construir query para contar total de produtos
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN users u ON p.sellerId = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (category) {
      countQuery += ' AND p.category = ?';
      countParams.push(category);
    }

    if (sellerId) {
      countQuery += ' AND p.sellerId = ?';
      countParams.push(sellerId);
    }

    if (status) {
      countQuery += ' AND p.status = ?';
      countParams.push(status);
    } else {
      countQuery += ' AND p.status = ?';
      countParams.push('available');
    }

    const totalResult = db.prepare(countQuery).get(...countParams);
    const total = totalResult.total;

    // Query para buscar os produtos
    let query = `
      SELECT 
        p.*,
        u.name as sellerName,
        u.avatar as sellerAvatar
      FROM products p
      LEFT JOIN users u ON p.sellerId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (sellerId) {
      query += ' AND p.sellerId = ?';
      params.push(sellerId);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    } else {
      query += ' AND p.status = ?';
      params.push('available');
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = db.prepare(query).all(...params);

    // Parse images JSON
    products.forEach(product => {
      product.images = product.images ? JSON.parse(product.images) : [];
    });

    res.json({
      products,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + products.length) < total
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Buscar produto por ID
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT 
        p.*,
        u.name as sellerName,
        u.avatar as sellerAvatar,
        u.phone as sellerPhone
      FROM products p
      LEFT JOIN users u ON p.sellerId = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    product.images = product.images ? JSON.parse(product.images) : [];

    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Criar produto (protegido)
router.post('/', verifyToken, upload.array('images', 5), (req, res) => {
  try {
    const { title, description, price, category, latitude, longitude } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Título e preço são obrigatórios' });
    }

    // URLs das imagens enviadas
    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    const result = db.prepare(`
      INSERT INTO products 
      (title, description, price, images, category, sellerId, latitude, longitude, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      parseFloat(price),
      JSON.stringify(images),
      category || null,
      req.userId,
      latitude || null,
      longitude || null,
      new Date().toISOString()
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    product.images = JSON.parse(product.images);

    res.status(201).json({
      message: 'Produto criado com sucesso',
      product
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Atualizar produto (protegido)
router.put('/:id', verifyToken, (req, res) => {
  try {
    const { title, description, price, category, status } = req.body;

    // Verificar se o produto pertence ao usuário
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND sellerId = ?')
      .get(req.params.id, req.userId);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado ou você não tem permissão' });
    }

    db.prepare(`
      UPDATE products 
      SET title = ?, description = ?, price = ?, category = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      title || product.title,
      description !== undefined ? description : product.description,
      price || product.price,
      category || product.category,
      status || product.status,
      new Date().toISOString(),
      req.params.id
    );

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    updatedProduct.images = JSON.parse(updatedProduct.images);

    res.json({
      message: 'Produto atualizado com sucesso',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto (protegido)
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND sellerId = ?')
      .get(req.params.id, req.userId);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado ou você não tem permissão' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

module.exports = router;
