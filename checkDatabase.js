const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database', 'marketplace.db');
const db = new sqlite3.Database(dbPath);

// Verificar a estrutura da tabela users
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('Erro ao verificar a estrutura da tabela users:', err);
    return;
  }
  
  console.log('Estrutura da tabela users:');
  console.log(row.sql);
  
  // Verificar os dados do usuário admin
  db.get("SELECT * FROM users WHERE email = 'admin@nhongastore.com'", (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário admin:', err);
      return;
    }
    
    console.log('\nDados do usuário admin:');
    console.log(JSON.stringify(user, null, 2));
    
    // Verificar se a tabela tem a coluna password
    db.get("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error('Erro ao verificar colunas da tabela users:', err);
        return;
      }
      
      console.log('\nColunas da tabela users:');
      console.log(columns);
      
      db.close();
    });
  });
});
