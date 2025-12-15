import React, { useState, useRef } from 'react';

/**
 * Chat Input Component
 * Input area for typing and sending messages
 */
function ChatInput({ onSend, isSending = false }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleSend = () => {
    if (isSending) return;

    if (inputValue.trim()) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-search-container">
      <input
        type="text"
        className="chat-search-input"
        id="user-input"
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        aria-label="Chat message input"
        autoComplete="off"
        spellCheck="true"
      />
      
      <button
        className="chat-button send-button"
        type="button"
        aria-label="Send message"
        title="Send message"
        id="send-button"
        onClick={handleSend}
        disabled={!inputValue.trim() || isSending}
        aria-busy={isSending}
      >
        {isSending ? (
          <div className="loading-spinner button-spinner" role="status" aria-label="Sending" />
        ) : (
          <svg id="send-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="m21.426 11.095-17-8A.999.999 0 0 0 3.03 4.242L4.969 12 3.03 19.758a.998.998 0 0 0 1.396 1.147l17-8a1 1 0 0 0 0-1.81zM5.481 18.197l.839-3.357L12 12 6.32 9.16l-.839-3.357L18.651 12l-13.17 6.197z"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default ChatInput;

