import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

/**
 * Chat Area Component
 * Main chat interface for conversations
 */
function ChatArea({ chatHistory, onSendMessage, onReceiveResponse, onNewChat, isSending }) {
  const [messages, setMessages] = useState(chatHistory);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages(chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (message) => {
    // Delegate sending to parent (App) so both WelcomeScreen and ChatInput share the same flow
    await onSendMessage(message);
  };     

  return (
    <div className="chat-area has-header" id="chat-area">
      <ChatHeader onNewChat={onNewChat} />
      
      <div className="chat-messages chat-container" id="chat-container">
        <ChatMessages messages={messages} isSending={isSending} />
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSend={handleSend} isSending={isSending} />
    </div>
  );
}

export default ChatArea;

