import React, { useState } from 'react';
import { showNotification } from '../../utils/notifications';
import { generateExcelFromData, generateExcelFromResponse } from '../../utils/excelGenerator';
import excelIcon from '../../assets/images/excel.png';

/**
 * Message Actions Component
 * Actions for each message (copy, excel, etc.)
 */
function MessageActions({ message, index, messages = [] }) {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Get the query from the previous user message
   */
  const getQuery = () => {
    // Find the previous user message in the messages array
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i] && messages[i].role === 'user') {
        return messages[i].text;
      }
    }
    return 'Unknown query';
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      showNotification('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  /**
   * Handle Excel download
   */
  const handleExcelDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      showNotification('Generating Excel file...', 'info');
      
      // Priority 1: Use excel_file_id if available (from backend that supports it)
      if (message.excel_file_id) {
        const apiBase = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
        const downloadUrl = `${apiBase}/download-excel/${message.excel_file_id}`;
        const response = await fetch(downloadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download Excel file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CGMSCL_Query_Results_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Excel file downloaded successfully!', 'success');
      }
      // Priority 2: Generate Excel from data rows (from current API)
      else if (message.dataRows && Array.isArray(message.dataRows) && message.dataRows.length > 0) {
        const filename = `CGMSCL_Query_Results_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        // Pass columns if available
        await generateExcelFromData(message.dataRows, filename, message.dataColumns);
        showNotification('Excel file downloaded successfully!', 'success');
      }
      // Priority 3: Generate Excel from suggestions (alternative data format)
      else if (message.suggestions && Array.isArray(message.suggestions) && message.suggestions.length > 0) {
        const filename = `CGMSCL_Query_Results_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        await generateExcelFromData(message.suggestions, filename);
        showNotification('Excel file downloaded successfully!', 'success');
      }
      // Priority 4: Generate Excel from response text (extract tables if present)
      else if (message.text) {
        const filename = `CGMSCL_Query_Results_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        await generateExcelFromResponse(message.text, filename);
        showNotification('Excel file downloaded successfully!', 'success');
      }
      else {
        throw new Error('No data available to export');
      }
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      showNotification('Failed to download Excel file. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="message-actions">
        <button 
          className="action-btn copy-btn"
          onClick={handleCopy}
          title="Copy message"
          aria-label="Copy message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        {(message.excel_download || message.excel_file_id || message.dataRows || message.suggestions) && (
          <button
            className="action-btn excel-download-btn"
            onClick={handleExcelDownload}
            title="Download Excel file"
            aria-label="Download Excel file"
            disabled={isDownloading}
          >
            <img src={excelIcon} alt="Download Excel" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
          </button>
        )}
      </div>
    </>
  );
}

export default MessageActions;

