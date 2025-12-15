import React, { useState, useEffect } from 'react';
import LoadingScreen from './common/LoadingScreen';
import WelcomeScreen from './welcome/WelcomeScreen';
import ChatArea from './chat/ChatArea';
import AnalysisPanel from './common/AnalysisPanel';
import VersionDisclaimer from './common/VersionDisclaimer';

/**
 * Main App Component
 * Manages application state and layout
 */
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed);
        // If there's history, show chat view
        if (parsed.length > 0) {
          setShowWelcome(false);
          setShowChat(true);
        }
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Hide loading screen after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);


  // Handle starting a new chat
  const handleNewChat = () => {
    setShowWelcome(true);
    setShowChat(false);
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  // Handle sending a message (switches to chat view)
  const handleSendMessage = async (message) => {
    if (!message || !message.trim()) return;

    setShowWelcome(false);
    setShowChat(true);
    setIsSending(true);

    const trimmed = message.trim();

    // Add user message to history immediately
    const userMessage = {
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    // Call backend Lambda for assistant response
    try {
      const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL ;
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      console.log('Data structure for Excel:', {
        hasData: !!data.data,
        hasRows: !!data.data?.rows,
        hasColumns: !!data.data?.columns,
        columns: data.data?.columns,
        rowSample: data.data?.rows?.[0]
      });
      
      const assistantMessage = {
        role: 'assistant',
        text: data.response || 'No response received.',
        sql_query: data.sql || null,
        suggestions: data.data?.rows || null,
        // Store data rows for Excel export (include columns if available)
        dataRows: data.data?.rows || null,
        // Try multiple possible locations for column names
        dataColumns: data.data?.columns || data.data?.columnNames || data.columns || null,
        // Show Excel button if we have tabular data
        excel_download: !!(data.data?.rows && Array.isArray(data.data.rows) && data.data.rows.length > 0),
        // Store visualization config for chart rendering
        visualization: data.visualization || null,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        sql_query: null,
        suggestions: null,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    setIsSending(false);
  };

  // Handle receiving a response
  const handleReceiveResponse = (response, sqlQuery = null, suggestions = null) => {
    const assistantMessage = {
      role: 'assistant',
      text: response,
      sql_query: sqlQuery,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, assistantMessage]);
    return assistantMessage;
  };

  return (
    <div className="copilot-layout" id="chatContainer">
      {isLoading && <LoadingScreen />}
      
      <div className="main-content" id="main-content">
        <AnalysisPanel />
        
        {showWelcome && (
          <WelcomeScreen 
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
          />
        )}
        
        {showChat && (
          <ChatArea
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            onReceiveResponse={handleReceiveResponse}
            onNewChat={handleNewChat}
            isSending={isSending}
          />
        )}
      </div>
      
      <VersionDisclaimer />
    </div>
  );
}

export default App;
