const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// Abrir banco de dados existente
const db = new Database(path.join(__dirname, 'marketplace.db'));

console.log('🔄 Iniciando migração do banco de dados...\n');

try {
  // 1. Adicionar coluna 'role' na tabela users
  console.log('1️⃣ Adicionando coluna "role" na tabela users...');
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
    console.log('   ✅ Coluna "role" adicionada');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('   ℹ️  Coluna "role" já existe');
    } else {
      throw error;
    }
  }

  // 2. Adicionar coluna 'isBanned' na tabela users
  console.log('2️⃣ Adicionando coluna "isBanned" na tabela users...');
  try {
    db.exec(`ALTER TABLE users ADD COLUMN isBanned INTEGER DEFAULT 0`);
    console.log('   ✅ Coluna "isBanned" adicionada');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('   ℹ️  Coluna "isBanned" já existe');
    } else {
      throw error;
    }
  }

  // 3. Adicionar coluna 'approvalStatus' na tabela products
  console.log('3️⃣ Adicionando coluna "approvalStatus" na tabela products...');
  try {
    db.exec(`ALTER TABLE products ADD COLUMN approvalStatus TEXT DEFAULT 'pending'`);
    console.log('   ✅ Coluna "approvalStatus" adicionada');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('   ℹ️  Coluna "approvalStatus" já existe');
    } else {
      throw error;
    }
  }

  // 4. Atualizar produtos existentes para 'approved'
  console.log('4️⃣ Atualizando produtos existentes...');
  const updateResult = db.prepare(`
    UPDATE products 
    SET approvalStatus = 'approved' 
    WHERE approvalStatus = 'pending'
  `).run();
  console.log(`   ✅ ${updateResult.changes} produtos marcados como aprovados`);

  // 5. Criar usuário admin padrão (se não existir)
  console.log('5️⃣ Criando usuário admin...');
  const adminEmail = 'admin@nhongastore.com';
  const adminPassword = 'admin123'; // MUDE ISSO EM PRODUÇÃO!
  
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (email, password, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminEmail, hashedPassword, 'Administrador', 'admin', new Date().toISOString());
    
    console.log('   ✅ Usuário admin criado');
    console.log('   📧 Email: admin@nhongastore.com');
    console.log('   🔑 Senha: admin123');
    console.log('   ⚠️  ATENÇÃO: Mude a senha em produção!');
  } else {
    console.log('   ℹ️  Usuário admin já existe');
    // Atualizar role para admin se ainda não for
    db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', adminEmail);
    console.log('   ✅ Role atualizada para admin');
  }

  // 6. Criar índices
  console.log('6️⃣ Criando índices...');
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_products_approval ON products(approvalStatus);
    `);
    console.log('   ✅ Índices criados');
  } catch (error) {
    console.log('   ℹ️  Índices já existem');
  }

  console.log('\n✅ Migração concluída com sucesso!\n');
  
} catch (error) {
  console.error('\n❌ Erro na migração:', error.message);
  process.exit(1);
}

db.close();
