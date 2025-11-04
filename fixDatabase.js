const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database', 'marketplace.db');
const db = new sqlite3.Database(dbPath);

// Função para criar um backup do banco de dados
function backupDatabase() {
  const backupPath = path.join(__dirname, 'database', 'marketplace_backup.db');
  const fs = require('fs');
  
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Backup do banco de dados criado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao criar backup do banco de dados:', error);
    return false;
  }
}

// Função para corrigir o banco de dados
function fixDatabase() {
  console.log('Iniciando correção do banco de dados...');
  
  // 1. Criar backup
  console.log('\n1. Criando backup do banco de dados...');
  if (!backupDatabase()) {
    console.log('⚠️  Não foi possível criar o backup. Continuando mesmo assim...');
  }
  
  // 2. Atualizar a estrutura da tabela users
  console.log('\n2. Atualizando a estrutura da tabela users...');
  
  db.serialize(() => {
    // Criar uma tabela temporária com a estrutura correta
    db.run(`
      CREATE TABLE IF NOT EXISTS users_new (
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
      )
    `);
    
    // Copiar os dados da tabela antiga para a nova
    db.run(`
      INSERT INTO users_new (
        id, email, password, name, phone, avatar, 
        latitude, longitude, role, isBanned, createdAt, updatedAt
      )
      SELECT 
        id, email, password, name, phone, avatar, 
        latitude, longitude, role, isBanned, createdAt, updatedAt
      FROM users
    `);
    
    // Renomear as tabelas
    db.run('DROP TABLE IF EXISTS users_old');
    db.run('ALTER TABLE users RENAME TO users_old');
    db.run('ALTER TABLE users_new RENAME TO users');
    
    console.log('✅ Estrutura da tabela users atualizada com sucesso!');
    
    // 3. Verificar e corrigir o usuário admin
    console.log('\n3. Verificando usuário admin...');
    
    db.get("SELECT * FROM users WHERE email = 'admin@nhongastore.com'", (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário admin:', err);
        return;
      }
      
      if (user) {
        console.log('Usuário admin encontrado. Verificando senha...');
        
        // Verificar se a senha está correta
        const password = 'admin123';
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(
          'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
          [hashedPassword, new Date().toISOString(), user.id],
          function(err) {
            if (err) {
              console.error('Erro ao atualizar a senha do admin:', err);
              return;
            }
            
            console.log('✅ Senha do admin atualizada com sucesso!');
            console.log('Email: admin@nhongastore.com');
            console.log('Nova senha: admin123');
            
            // Verificar se a atualização foi bem-sucedida
            db.get(
              'SELECT email, password FROM users WHERE id = ?', 
              [user.id],
              (err, row) => {
                if (err) {
                  console.error('Erro ao verificar a atualização:', err);
                  return;
                }
                
                console.log('\nVerificação:');
                console.log('Email:', row.email);
                console.log('Senha (hash):', row.password);
                
                // Verificar se a senha está correta
                const isMatch = bcrypt.compareSync(password, row.password);
                console.log('Senha verificada com sucesso?', isMatch);
                
                db.close();
              }
            );
          }
        );
      } else {
        console.log('Usuário admin não encontrado. Criando...');
        
        const email = 'admin@nhongastore.com';
        const password = 'admin123';
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(
          `INSERT INTO users (email, password, name, role, createdAt) 
           VALUES (?, ?, ?, ?, ?)`,
          [email, hashedPassword, 'Admin', 'admin', new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Erro ao criar usuário admin:', err);
              return;
            }
            
            console.log('✅ Usuário admin criado com sucesso!');
            console.log(`Email: ${email}`);
            console.log(`Senha: ${password}`);
            
            db.close();
          }
        );
      }
    });
  });
}

// Executar a correção
fixDatabase();
