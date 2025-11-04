const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'marketplace.db');

// Conectar ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados SQLite.');
});

// Função para verificar e corrigir o usuário admin
async function fixAdminUser() {
  try {
    const email = 'admin@nhongastore.com';
    const password = 'admin123';
    
    // Verificar se o usuário existe
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return;
      }
      
      if (!user) {
        console.log('Usuário admin não encontrado. Criando...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
          'INSERT INTO users (email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)',
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
      } else {
        console.log('Usuário encontrado:');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Senha (hash):', user.password);
        console.log('Role:', user.role);
        
        // Atualizar a senha para garantir que está correta
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
          'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
          [hashedPassword, new Date().toISOString(), user.id],
          function(err) {
            if (err) {
              console.error('Erro ao atualizar a senha:', err);
              return;
            }
            console.log('✅ Senha do usuário admin atualizada com sucesso!');
            console.log(`Nova senha: ${password}`);
            db.close();
          }
        );
      }
    });
  } catch (error) {
    console.error('Erro ao corrigir usuário admin:', error);
    db.close();
  }
}

// Executar a função
fixAdminUser();
