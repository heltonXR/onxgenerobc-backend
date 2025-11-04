const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database', 'marketplace.db');
const db = new sqlite3.Database(dbPath);

// Verificar se o usuário admin existe
function checkAdminUser() {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE email = 'admin@nhongastore.com'", [], (err, row) => {
      if (err) {
        console.error('Erro ao verificar usuário admin:', err);
        return reject(err);
      }
      
      if (row) {
        console.log('Usuário admin encontrado:');
        console.log('ID:', row.id);
        console.log('Email:', row.email);
        console.log('Senha (hash):', row.password ? '***' : 'NÃO DEFINIDA');
        console.log('Role:', row.role);
        
        // Verificar se a senha está definida
        if (!row.password) {
          console.log('\n⚠️  O usuário admin não tem senha definida!');
          console.log('Vamos definir uma senha segura...');
          updatePassword(row.id);
        } else {
          resolve(row);
        }
      } else {
        console.log('Usuário admin não encontrado. Criando...');
        createAdminUser();
      }
    });
  });
}

// Criar usuário admin
function createAdminUser() {
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
      console.log('Email: admin@nhongastore.com');
      console.log('Senha: admin123');
      
      db.close();
    }
  );
}

// Atualizar senha do usuário
function updatePassword(userId) {
  const password = 'admin123';
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(
    'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
    [hashedPassword, new Date().toISOString(), userId],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar senha:', err);
        return;
      }
      
      console.log('\n✅ Senha do usuário admin atualizada com sucesso!');
      console.log('Nova senha: admin123');
      
      db.close();
    }
  );
}

// Executar a verificação
checkAdminUser().catch(console.error);
