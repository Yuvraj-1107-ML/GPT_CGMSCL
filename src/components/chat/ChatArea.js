import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ChatSuggestions from './ChatSuggestions';
import PromptGalleryModal from '../modals/PromptGalleryModal';

/**
 * Chat Area Component
 * Main chat interface for conversations
 */
function ChatArea({ chatHistory, onSendMessage, onReceiveResponse, onNewChat, isSending }) {
  const [messages, setMessages] = useState(chatHistory);
  const [showPromptGallery, setShowPromptGallery] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

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

  const handleSuggestionSelect = (suggestion) => {
    // Prefill chat input with chosen suggestion and focus for quick editing
    chatInputRef.current?.setValue(suggestion);
  };

  const handlePromptSelect = (prompt) => {
    chatInputRef.current?.setValue(prompt);
    setShowPromptGallery(false);
  };

  // Show floating suggestions only after at least one assistant response exists,
  // mirroring the behavior in igl.html (chips appear under a generated answer).
  const hasAssistantResponse = messages.some((msg) => msg.role === 'assistant');

  return (
    <div className="chat-area has-header" id="chat-area">
      <ChatHeader onNewChat={onNewChat} />
      
      <div className="chat-messages chat-container" id="chat-container">
        <ChatMessages messages={messages} isSending={isSending} />

        {hasAssistantResponse && (
          <div className="floating-suggestions-container inline-floating" data-floating="gallery-btn">
            <div className="floating-suggestions-wrapper">
              <ChatSuggestions
                onSelectSuggestion={handleSuggestionSelect}
                onOpenPromptGallery={() => setShowPromptGallery(true)}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <ChatInput ref={chatInputRef} onSend={handleSend} isSending={isSending} />
      </div>

      {showPromptGallery && (
        <PromptGalleryModal
          onClose={() => setShowPromptGallery(false)}
          onPromptSelect={handlePromptSelect}
        />
      )}
    </div>
  );
}

export default ChatArea;

