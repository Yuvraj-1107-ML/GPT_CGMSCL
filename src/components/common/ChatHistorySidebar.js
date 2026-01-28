import React, { useState } from 'react';

/**
 * Chat History Sidebar Component
 * Displays list of previous chat sessions and allows navigation between them
 */
function ChatHistorySidebar({ 
  chatSessions = [], 
  currentChatId = null, 
  onSelectChat = () => {},
  onNewChat = () => {},
  onDeleteChat = () => {},
  isOpen = false,
  onClose = () => {}
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get title for a chat session (first user message or "New Chat")
  const getChatTitle = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'New Chat';
    }
    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const text = firstUserMessage.text || '';
      // Truncate to 50 characters
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return 'New Chat';
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get last activity timestamp
  const getLastActivity = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return session.createdAt || session.timestamp;
    }
    const lastMessage = session.messages[session.messages.length - 1];
    return lastMessage.timestamp || session.updatedAt || session.timestamp;
  };

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        className="chat-history-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle chat history"
        title="Chat History"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Overlay */}
      {isExpanded && (
        <div 
          className="chat-history-overlay"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`chat-history-sidebar ${isExpanded ? 'open' : ''}`}>
        <div className="chat-history-header">
          <h3>Chat History</h3>
          <button
            className="chat-history-close"
            onClick={() => setIsExpanded(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-history-content">
          <button
            className="new-chat-button"
            onClick={() => {
              onNewChat();
              setIsExpanded(false);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>New Chat</span>
          </button>

          <div className="chat-history-list">
            {chatSessions.length === 0 ? (
              <div className="chat-history-empty">
                <p>No previous chats</p>
                <span>Start a new conversation to see it here</span>
              </div>
            ) : (
              chatSessions.map((session) => {
                const isActive = session.id === currentChatId;
                const title = getChatTitle(session);
                const lastActivity = getLastActivity(session);
                
                return (
                  <div
                    key={session.id}
                    className={`chat-history-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectChat(session.id);
                      setIsExpanded(false);
                    }}
                  >
                    <div className="chat-history-item-content">
                      <div className="chat-history-item-title">{title}</div>
                      <div className="chat-history-item-meta">
                        <span className="chat-history-item-time">{formatDate(lastActivity)}</span>
                        {session.messages && (
                          <span className="chat-history-item-count">
                            {session.messages.filter(m => m.role === 'user').length} messages
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="chat-history-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this chat?')) {
                          onDeleteChat(session.id);
                        }
                      }}
                      aria-label="Delete chat"
                      title="Delete chat"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatHistorySidebar;
