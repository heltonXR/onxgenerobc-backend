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

// Função para criar um usuário admin
async function createAdmin() {
  try {
    const email = 'admin@nhongastore.com';
    const password = 'admin123';
    const name = 'Admin';
    
    // Verificar se o usuário já existe
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Erro ao verificar usuário existente:', err);
        return;
      }
      
      if (row) {
        console.log('Usuário admin já existe:');
        console.log(`Email: ${row.email}`);
        console.log(`Senha: ${password}`);
        return;
      }
      
      // Criar hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Inserir usuário admin
      db.run(
        'INSERT INTO users (email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, name, 'admin', new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('Erro ao criar usuário admin:', err);
            return;
          }
          console.log('Usuário admin criado com sucesso!');
          console.log(`Email: ${email}`);
          console.log(`Senha: ${password}`);
          
          // Fechar conexão com o banco de dados
          db.close();
        }
      );
    });
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    db.close();
  }
}

// Executar a função
createAdmin();
