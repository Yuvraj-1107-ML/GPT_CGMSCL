import React, { useState, useEffect } from 'react';
import LoadingScreen from './common/LoadingScreen';
import WelcomeScreen from './welcome/WelcomeScreen';
import ChatArea from './chat/ChatArea';
import AnalysisPanel from './common/AnalysisPanel';
import VersionDisclaimer from './common/VersionDisclaimer';
import CompanyLogoMark from './common/CompanyLogoMark';
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

    // Start response timer for enhanced feedback tracking
    // startResponseTimer();

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
      console.log('API Response Data (Full):', JSON.stringify(data, null, 2));
      console.log('API Response Data (Object):', data);
      
      // Check multiple possible paths for data rows
      // API structure: data.data.result.rows (new format) or data.data.rows (old format)
      let possibleRows = null;
      if (Array.isArray(data.data?.result?.rows) && data.data.result.rows.length > 0) {
        possibleRows = data.data.result.rows;
      } else if (Array.isArray(data.data?.rows) && data.data.rows.length > 0) {
        possibleRows = data.data.rows;
      } else if (Array.isArray(data.data) && data.data.length > 0) {
        possibleRows = data.data;
      } else if (Array.isArray(data.rows) && data.rows.length > 0) {
        possibleRows = data.rows;
      }
      
      // Check multiple possible paths for columns
      // API structure: data.data.result.columns (new format) or data.data.columns (old format)
      let possibleColumns = null;
      if (Array.isArray(data.data?.result?.columns) && data.data.result.columns.length > 0) {
        possibleColumns = data.data.result.columns;
      } else if (Array.isArray(data.data?.columns) && data.data.columns.length > 0) {
        possibleColumns = data.data.columns;
      } else if (Array.isArray(data.data?.columnNames) && data.data.columnNames.length > 0) {
        possibleColumns = data.data.columnNames;
      } else if (Array.isArray(data.columns) && data.columns.length > 0) {
        possibleColumns = data.columns;
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
