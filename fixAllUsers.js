const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database', 'marketplace.db');
const db = new sqlite3.Database(dbPath);

// Senha padrão para usuários sem senha
const DEFAULT_PASSWORD = 'senha123';

// Função para corrigir todos os usuários
function fixAllUsers() {
  console.log('Buscando todos os usuários...');
  
  // Primeiro, listar todos os usuários
  db.all('SELECT id, email, name, password FROM users', [], (err, users) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err);
      return;
    }
    
    console.log(`\nEncontrados ${users.length} usuários no banco de dados.`);
    
    let fixedCount = 0;
    const updatePromises = [];
    
    users.forEach(user => {
      console.log(`\n---\nVerificando usuário: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`Tem senha? ${!!user.password ? 'Sim' : 'NÃO'}`);
      
      // Se não tiver senha, vamos definir uma
      if (!user.password) {
        console.log(`⚠️  Usuário sem senha. Definindo senha padrão...`);
        const hashedPassword = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
        
        const updatePromise = new Promise((resolve, reject) => {
          db.run(
            'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
            [hashedPassword, new Date().toISOString(), user.id],
            function(updateErr) {
              if (updateErr) {
                console.error(`❌ Erro ao atualizar usuário ${user.email}:`, updateErr);
                return reject(updateErr);
              }
              
              console.log(`✅ Usuário ${user.email} atualizado com sucesso!`);
              console.log(`Nova senha: ${DEFAULT_PASSWORD}`);
              fixedCount++;
              resolve();
            }
          );
        });
        
        updatePromises.push(updatePromise);
      }
    });
    
    // Aguardar todas as atualizações terminarem
    Promise.all(updatePromises)
      .then(() => {
        console.log(`\n✅ Processo concluído!`);
        console.log(`Total de usuários corrigidos: ${fixedCount} de ${users.length}`);
        
        if (fixedCount > 0) {
          console.log(`\n🔑 Credenciais de acesso:`);
          users.forEach(user => {
            if (!user.password) {
              console.log(`Email: ${user.email} | Senha: ${DEFAULT_PASSWORD}`);
            }
          });
        }
        
        db.close();
      })
      .catch(error => {
        console.error('Erro durante o processo:', error);
        db.close();
      });
  });
}

// Executar a correção
fixAllUsers();
