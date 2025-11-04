// checkAndFix.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'database', 'marketplace.db');
console.log(`Verificando banco de dados em: ${dbPath}`);

// Verificar se o arquivo do banco de dados existe
if (!fs.existsSync(dbPath)) {
  console.error('❌ Arquivo do banco de dados não encontrado!');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados com sucesso!');
});

// Função para executar consultas SQL
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erro na consulta:', query);
        console.error(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Função para executar comandos SQL
function runCommand(command, params = []) {
  return new Promise((resolve, reject) => {
    db.run(command, params, function(err) {
      if (err) {
        console.error('Erro ao executar comando:', command);
        console.error(err);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Função principal
async function main() {
  try {
    // 1. Verificar se a tabela de usuários existe
    console.log('\n🔍 Verificando tabela de usuários...');
    const tableExists = await runQuery(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    
    if (tableExists.length === 0) {
      console.log('❌ Tabela de usuários não encontrada. Criando...');
      await runCommand(`
        CREATE TABLE users (
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
          approvalStatus TEXT DEFAULT 'pending',
          createdAt TEXT NOT NULL,
          updatedAt TEXT
        )
      `);
      console.log('✅ Tabela de usuários criada com sucesso!');
    } else {
      console.log('✅ Tabela de usuários encontrada.');
    }

    // 2. Verificar se o usuário helton@gmail.com existe
    console.log('\n🔍 Verificando usuário helton@gmail.com...');
    const user = await runQuery('SELECT * FROM users WHERE email = ?', ['helton@gmail.com']);
    
    if (user.length === 0) {
      console.log('❌ Usuário não encontrado. Criando...');
      const hashedPassword = bcrypt.hashSync('senha123', 10);
      await runCommand(
        `INSERT INTO users (email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)`,
        ['helton@gmail.com', hashedPassword, 'Helton', 'user', new Date().toISOString()]
      );
      console.log('✅ Usuário criado com sucesso!');
      console.log('   Email: helton@gmail.com');
      console.log('   Senha: senha123');
    } else {
      // 3. Verificar e corrigir senha se necessário
      const currentUser = user[0];
      console.log('✅ Usuário encontrado!');
      console.log(`   ID: ${currentUser.id}`);
      console.log(`   Nome: ${currentUser.name}`);
      console.log(`   Senha definida: ${currentUser.password ? '✅ Sim' : '❌ Não'}`);
      
      if (!currentUser.password) {
        console.log('⚠️  Senha não definida. Corrigindo...');
        const hashedPassword = bcrypt.hashSync('senha123', 10);
        await runCommand(
          'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
          [hashedPassword, new Date().toISOString(), currentUser.id]
        );
        console.log('✅ Senha definida com sucesso!');
        console.log('   Nova senha: senha123');
      }
    }

    console.log('\n🎉 Verificação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    db.close();
  }
}

// Executar a função principal
main();
