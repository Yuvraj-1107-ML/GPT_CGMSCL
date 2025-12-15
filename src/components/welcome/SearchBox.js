import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { suggestionPills } from '../../data/promptCards';

/**
 * Search Box Component
 * Microsoft Copilot-style search interface
 */
const SearchBox = forwardRef(function SearchBox({ onSendMessage, onOpenPromptGallery }, ref) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Expose method to set input value from parent component
  useImperativeHandle(ref, () => ({
    setValue: (value) => {
      setInputValue(value);
      inputRef.current?.focus();
    }
  }));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="copilot-search-container">
      {/* Floating suggestions */}
      <div className="floating-suggestions">
        {suggestionPills.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-pill"
            onClick={() => handleSuggestionClick(suggestion)}
            style={{ animationDelay: `${(index + 1) * 0.1}s` }}
          >
            {suggestion}
          </button>
        ))}
        <button
          className="prompt-gallery-btn"
          onClick={onOpenPromptGallery}
          title="Prompt Gallery"
          style={{ animationDelay: '0.4s' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Search input area */}
      <div className="copilot-search-box">
        <input
          type="text"
          id="copilot-search-input"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Draft an email to about..."
        />
        <button
          className="send-btn"
          id="copilot-send-btn"
          onClick={handleSend}
          title="Send message"
          disabled={!inputValue.trim()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

export default SearchBox;

