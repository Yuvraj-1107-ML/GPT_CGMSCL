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
  const chatContainerRef = useRef(null);
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    setMessages(chatHistory);
  }, [chatHistory]);

  // Scroll to bottom when messages change or when sending status changes
  useEffect(() => {
    // Only scroll to bottom when new messages are added or when response is being generated
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    
    if ((hasNewMessages || isSending) && chatContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          // Scroll to bottom smoothly
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
    
    // Update previous length
    previousMessagesLengthRef.current = messages.length;
  }, [messages, isSending]);

  const handleSend = async (message) => {
    // Delegate sending to parent (App) so both WelcomeScreen and ChatInput share the same flow
    await onSendMessage(message);
  };     

  const handlePromptSelect = (prompt) => {
    chatInputRef.current?.setValue(prompt);
    setShowPromptGallery(false);
  };

  // Show floating gallery button only after at least one assistant response exists,
  // and hide it while generating a response (isSending).
  // The button appears under the response, matching the behavior in igl.html.
  const hasAssistantResponse = messages.some((msg) => msg.role === 'assistant');
  const shouldShowGalleryButton = hasAssistantResponse && !isSending;

  return (
    <div className="chat-area has-header" id="chat-area">
      <ChatHeader onNewChat={onNewChat} isSending={isSending} chatHistory={chatHistory} />
      
      <div 
        ref={chatContainerRef}
        className="chat-messages chat-container" 
        id="chat-container"
      >
        <ChatMessages messages={messages} isSending={isSending} />

        {shouldShowGalleryButton && (
          <div className="floating-suggestions-container inline-floating" data-floating="gallery-btn">
            <div className="floating-suggestions-wrapper">
              <ChatSuggestions
                onOpenPromptGallery={() => setShowPromptGallery(true)}
              /> 
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <ChatInput 
          ref={chatInputRef} 
          onSend={handleSend} 
          isSending={isSending} 
        />
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

