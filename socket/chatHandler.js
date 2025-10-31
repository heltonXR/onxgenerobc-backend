const db = require('../database/init');

module.exports = (io, socket) => {
  console.log('✅ Chat handler conectado para:', socket.id);

  // Entrar em uma sala de chat
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`📩 Socket ${socket.id} entrou no chat ${chatId}`);
  });

  // Enviar mensagem
  socket.on('send_message', (data) => {
    try {
      const { chatId, senderId, text, image } = data;

      // Validar dados
      if (!chatId || !senderId || (!text && !image)) {
        console.log('Dados inválidos para enviar mensagem:', data);
        return;
      }

      // Salvar mensagem no banco
      const result = db.prepare(`
        INSERT INTO messages (chatId, senderId, text, image, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(chatId, senderId, text || null, image || null, new Date().toISOString());

      // Atualizar última mensagem do chat
      db.prepare(`
        UPDATE chats 
        SET lastMessage = ?, lastMessageAt = ?
        WHERE id = ?
      `).run(text || '[Imagem]', new Date().toISOString(), chatId);

      // Buscar mensagem criada com informações do usuário
      const message = db.prepare(`
        SELECT m.*, u.name as senderName, u.avatar as senderAvatar
        FROM messages m
        LEFT JOIN users u ON m.senderId = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      // Emitir para todos na sala
      io.to(`chat_${chatId}`).emit('new_message', message);

      console.log(`💬 Nova mensagem no chat ${chatId}:`, message.text || '[Imagem]');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      socket.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  });

  // Marcar mensagens como lidas
  socket.on('mark_as_read', (data) => {
    try {
      const { chatId, userId } = data;

      // Validar dados
      if (!chatId || !userId) {
        console.log('Dados inválidos para marcar como lido:', data);
        return;
      }

      const result = db.prepare(`
        UPDATE messages 
        SET isRead = 1 
        WHERE chatId = ? AND senderId != ? AND isRead = 0
      `).run(chatId, userId);

      console.log(`✅ ${result.changes} mensagens marcadas como lidas no chat ${chatId} para usuário ${userId}`);

      io.to(`chat_${chatId}`).emit('messages_read', { chatId, userId });
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  });

  // Digitando...
  socket.on('typing', (data) => {
    const { chatId, userId, userName } = data;
    if (chatId && userId && userName) {
      socket.to(`chat_${chatId}`).emit('user_typing', { userId, userName });
    }
  });

  // Parou de digitar
  socket.on('stop_typing', (data) => {
    const { chatId, userId } = data;
    if (chatId && userId) {
      socket.to(`chat_${chatId}`).emit('user_stop_typing', { userId });
    }
  });

  // Desconectar
  socket.on('disconnect', () => {
    console.log('❌ Chat handler desconectado:', socket.id);
  });
};