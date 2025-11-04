const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database', 'marketplace.db');
const db = new sqlite3.Database(dbPath);

// Email e senha do admin
const ADMIN_EMAIL = 'admin@nhongastore.com';
const ADMIN_PASSWORD = 'admin123';

// Função para atualizar a senha do usuário
function updateAdminPassword() {
  console.log('Atualizando senha do usuário admin...');
  
  // Gerar o hash da senha
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  
  // Atualizar a senha no banco de dados
  db.run(
    'UPDATE users SET password = ?, updatedAt = ? WHERE email = ?',
    [hashedPassword, new Date().toISOString(), ADMIN_EMAIL],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar a senha:', err);
        return;
      }
      
      if (this.changes === 0) {
        console.log(`Usuário com email ${ADMIN_EMAIL} não encontrado.`);
        console.log('Criando usuário admin...');
        createAdminUser();
        return;
      }
      
      console.log('✅ Senha do admin atualizada com sucesso!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Nova senha: ${ADMIN_PASSWORD}`);
      
      // Verificar se a atualização foi bem-sucedida
      db.get(
        'SELECT email, password FROM users WHERE email = ?', 
        [ADMIN_EMAIL],
        (err, row) => {
          if (err) {
            console.error('Erro ao verificar a atualização:', err);
            return;
          }
          
          console.log('\nVerificação:');
          console.log('Email:', row.email);
          console.log('Senha (hash):', row.password);
          
          // Verificar se a senha está correta
          const isMatch = bcrypt.compareSync(ADMIN_PASSWORD, row.password);
          console.log('Senha verificada com sucesso?', isMatch);
          
          db.close();
        }
      );
    }
  );
}

// Função para criar o usuário admin se não existir
function createAdminUser() {
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  
  db.run(
    `INSERT INTO users (email, password, name, role, createdAt) 
     VALUES (?, ?, ?, ?, ?)`,
    [ADMIN_EMAIL, hashedPassword, 'Admin', 'admin', new Date().toISOString()],
    function(err) {
      if (err) {
        console.error('Erro ao criar usuário admin:', err);
        return;
      }
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Senha: ${ADMIN_PASSWORD}`);
      
      db.close();
    }
  );
}

// Executar a correção
updateAdminPassword();
