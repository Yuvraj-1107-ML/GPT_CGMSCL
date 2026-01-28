import React, { useState, useEffect } from 'react';
import LoadingScreen from './common/LoadingScreen';
import WelcomeScreen from './welcome/WelcomeScreen';
import ChatArea from './chat/ChatArea';
import AnalysisPanel from './common/AnalysisPanel';
import VersionDisclaimer from './common/VersionDisclaimer';
import CompanyLogoMark from './common/CompanyLogoMark';
import ChatHistorySidebar from './common/ChatHistorySidebar';
// import { startResponseTimer } from '../utils/feedbackService';

/**
 * Main App Component
 * Manages application state and layout
 */
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Generate unique ID for chat sessions
  const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setChatSessions(parsed);
        // If there are sessions, load the most recent one
        if (parsed.length > 0) {
          const mostRecent = parsed.sort((a, b) => {
            const aTime = a.updatedAt || a.createdAt || 0;
            const bTime = b.updatedAt || b.createdAt || 0;
            return new Date(bTime) - new Date(aTime);
          })[0];
          setCurrentChatId(mostRecent.id);
          setChatHistory(mostRecent.messages || []);
          setShowWelcome(false);
          setShowChat(true);
        }
      } catch (e) {
        console.error('Error loading chat sessions:', e);
      }
    } else {
      // Migrate old chatHistory format to new chatSessions format
      const oldHistory = localStorage.getItem('chatHistory');
      if (oldHistory) {
        try {
          const parsed = JSON.parse(oldHistory);
          if (parsed.length > 0) {
            const chatId = generateChatId();
            const session = {
              id: chatId,
              messages: parsed,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setChatSessions([session]);
            setCurrentChatId(chatId);
            setChatHistory(parsed);
            setShowWelcome(false);
            setShowChat(true);
            localStorage.setItem('chatSessions', JSON.stringify([session]));
            localStorage.removeItem('chatHistory');
          }
        } catch (e) {
          console.error('Error migrating chat history:', e);
        }
      }
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current chat session when chatHistory changes
  useEffect(() => {
    if (currentChatId && chatHistory.length > 0) {
      setChatSessions(prev => prev.map(session => {
        if (session.id === currentChatId) {
          return {
            ...session,
            messages: chatHistory,
            updatedAt: new Date().toISOString()
          };
        }
        return session;
      }));
    }
  }, [chatHistory, currentChatId]);

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
    setCurrentChatId(null);
  };

  // Handle selecting a chat from history
  const handleSelectChat = (chatId) => {
    const session = chatSessions.find(s => s.id === chatId);
    if (session) {
      setCurrentChatId(chatId);
      setChatHistory(session.messages || []);
      setShowWelcome(false);
      setShowChat(true);
    }
  };

  // Handle deleting a chat session
  const handleDeleteChat = (chatId) => {
    const updatedSessions = chatSessions.filter(s => s.id !== chatId);
    setChatSessions(updatedSessions);

    // If deleted chat was current, switch to welcome or another chat
    if (chatId === currentChatId) {
      if (updatedSessions.length > 0) {
        const mostRecent = updatedSessions.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || 0;
          const bTime = b.updatedAt || b.createdAt || 0;
          return new Date(bTime) - new Date(aTime);
        })[0];
        handleSelectChat(mostRecent.id);
      } else {
        handleNewChat();
      }
    }
  };

  // Handle sending a message (switches to chat view)
  const handleSendMessage = async (message) => {
    if (!message || !message.trim()) return;

    setShowWelcome(false);
    setShowChat(true);
    setIsSending(true);

    const trimmed = message.trim();

    // Create new chat session if needed
    if (!currentChatId) {
      const newChatId = generateChatId();
      const newSession = {
        id: newChatId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCurrentChatId(newChatId);
      setChatSessions(prev => [...prev, newSession]);
    }

    // Add user message to history immediately
    const userMessage = {
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    // Start response timer for enhanced feedback tracking
    // startResponseTimer();

    // Call backend Lambda for assistant response
    try {
      // Always use AWS backend as per requirements
      const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL;

      console.log(`Sending request to AWS backend:`, CHAT_API_URL);

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
      console.log('API Response Data (Full):', JSON.stringify(data, null, 2));
      console.log('API Response Data (Object):', data);

      // Lambda backend response format: { query, sql, data, response, visualization }
      // The 'data' field contains sql_result which can be:
      // 1. List of dictionaries: [{col1: val1, col2: val2}, ...]
      // 2. Dictionary with 'rows' key: {rows: [...], columns: [...]}
      // 3. Dictionary with 'data' key: {data: [...], columns: [...]}
      // 4. Dictionary with 'results' key: {results: [...]}

      let possibleRows = null;
      let possibleColumns = null;

      // Handle Lambda response format (data.data is the sql_result)
      if (data.data) {
        // Case 1: data.data is a list of dictionaries (most common Lambda format)
        if (Array.isArray(data.data) && data.data.length > 0) {
          possibleRows = data.data;
          // Extract column names from first row if it's an object
          if (data.data[0] && typeof data.data[0] === 'object' && !Array.isArray(data.data[0])) {
            possibleColumns = Object.keys(data.data[0]);
          }
        }
        // Case 2: data.data is a dictionary with 'rows' or 'data' key
        else if (typeof data.data === 'object' && !Array.isArray(data.data)) {
          if (Array.isArray(data.data.rows) && data.data.rows.length > 0) {
            possibleRows = data.data.rows;
            possibleColumns = data.data.columns || data.data.columnNames;
          } else if (Array.isArray(data.data.data) && data.data.data.length > 0) {
            possibleRows = data.data.data;
            possibleColumns = data.data.columns || data.data.columnNames;
          } else if (Array.isArray(data.data.results) && data.data.results.length > 0) {
            possibleRows = data.data.results;
            possibleColumns = data.data.columns || data.data.columnNames;
          }
        }
      }

      // Fallback: Check other possible paths (for backward compatibility)
      if (!possibleRows) {
        if (Array.isArray(data.data?.result?.rows) && data.data.result.rows.length > 0) {
          possibleRows = data.data.result.rows;
          possibleColumns = data.data.result.columns;
        } else if (Array.isArray(data.rows) && data.rows.length > 0) {
          possibleRows = data.rows;
          possibleColumns = data.columns;
        }
      }

      // If still no columns found, try to extract from rows
      if (possibleRows && !possibleColumns && Array.isArray(possibleRows) && possibleRows.length > 0) {
        const firstRow = possibleRows[0];
        if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
          possibleColumns = Object.keys(firstRow);
        }
      }

      // Check what data.data actually contains
      console.log('Data structure analysis:', {
        hasData: !!data.data,
        hasResult: !!data.data?.result,
        hasResultRows: !!data.data?.result?.rows,
        hasResultColumns: !!data.data?.result?.columns,
        resultRowsLength: data.data?.result?.rows?.length || 0,
        resultColumnsLength: data.data?.result?.columns?.length || 0,
        // Old format checks
        hasRows: !!data.data?.rows,
        hasColumns: !!data.data?.columns,
        rowsLength: data.data?.rows?.length || 0,
        columnsLength: data.data?.columns?.length || 0,
        // Found values
        foundRows: !!possibleRows,
        foundRowsLength: possibleRows?.length || 0,
        foundColumns: !!possibleColumns,
        foundColumnsLength: possibleColumns?.length || 0
      });

      console.log('Data structure for Chart:', {
        hasVisualization: !!data.visualization,
        visualization: data.visualization,
        chartType: data.visualization?.chartType
      });

      // Check if visualization config has embedded data
      let visualizationDataRows = null;
      let visualizationDataColumns = null;
      if (data.visualization?.data) {
        if (Array.isArray(data.visualization.data)) {
          visualizationDataRows = data.visualization.data;
        } else if (data.visualization.data.rows) {
          visualizationDataRows = data.visualization.data.rows;
          visualizationDataColumns = data.visualization.data.columns;
        }
      }

      // Use visualization data if no other data found
      const finalDataRows = possibleRows || visualizationDataRows || data.data?.rows || (Array.isArray(data.data) ? data.data : null) || null;
      const finalDataColumns = possibleColumns || visualizationDataColumns || data.data?.columns || data.data?.columnNames || data.columns || null;

      const assistantMessage = {
        role: 'assistant',
        text: data.response || 'No response received.',
        sql_query: data.sql || null,
        suggestions: finalDataRows || null,
        // Store data rows for Excel export (try multiple paths including visualization data)
        dataRows: finalDataRows,
        // Try multiple possible locations for column names
        dataColumns: finalDataColumns,
        // Show Excel button if we have tabular data
        excel_download: !!(finalDataRows && Array.isArray(finalDataRows) && finalDataRows.length > 0),
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

        {/* Chat History Sidebar - only show when in chat view */}
        {showChat && (
          <ChatHistorySidebar
            chatSessions={chatSessions}
            currentChatId={currentChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        )}

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
      <CompanyLogoMark />
    </div>
  );
}

export default App;
