import React from 'react';
import MessageActions from './MessageActions';
import AnalysisDropdown from '../common/AnalysisDropdown';
import Chart from './Chart';

/**
 * Message Bubble Component
 * Individual message display with actions
 */
function MessageBubble({ message, index, messages = [] }) {
  const isUser = message.role === 'user';

  // Prepare data for chart if visualization exists
  const chartData = message.visualization && message.dataRows ? {
    rows: message.dataRows,
    columns: message.dataColumns || []
  } : null;

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="message-bubble">
        <div className="message-content">
          {/* Analysis Dropdown - shown only when toggle is ON and SQL query exists */}
          {!isUser && message.sql_query && (
            <AnalysisDropdown sqlQuery={message.sql_query} />
          )}
          
          <div className="message-text">
            {message.text}
          </div>

          {/* Chart - shown when visualization config exists */}
          {!isUser && message.visualization && chartData && (
            <Chart visualization={message.visualization} data={chartData} />
          )}
        </div>
        
        {!isUser && (
          <MessageActions message={message} index={index} messages={messages} />
        )}
      </div>
    </div>
  );
}

export default MessageBubble;

