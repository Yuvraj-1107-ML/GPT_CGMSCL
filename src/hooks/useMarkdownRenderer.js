import { useEffect, useCallback } from 'react';
import { generateExcelFromData } from '../utils/excelGenerator';
import { showNotification } from '../utils/notifications';

/**
 * Make a table cell clickable for Excel export
 */
function makeCellClickable(cell, cellType, rowData, headers, rcStatusIndex, statusActionIndex) {
  // Skip if already has click handler
  if (cell.dataset.hasClickHandler === 'true') return;
  
  cell.style.cursor = 'pointer';
  cell.style.transition = 'background-color 0.2s, transform 0.1s';
  cell.title = `Click to export ${cellType} items to Excel`;
  cell.classList.add('clickable-tender-cell');
  
  cell.addEventListener('mouseenter', () => {
    if (!cell.classList.contains('exporting')) {
      cell.style.backgroundColor = '#dbeafe';
      cell.style.transform = 'scale(1.02)';
    }
  });
  
  cell.addEventListener('mouseleave', () => {
    if (!cell.classList.contains('exporting')) {
      cell.style.backgroundColor = '';
      cell.style.transform = '';
    }
  });
  
  cell.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    // Prevent multiple clicks
    if (cell.classList.contains('exporting')) return;
    
    cell.classList.add('exporting');
    cell.style.backgroundColor = '#bfdbfe';
    cell.style.opacity = '0.8';
    
    try {
      // Get filter values from row
      const rcStatus = rcStatusIndex >= 0 ? rowData[headers[rcStatusIndex]] : null;
      const statusAction = statusActionIndex >= 0 ? rowData[headers[statusActionIndex]] : null;
      
      showNotification(`Fetching ${cellType} items...`, 'info');
      
      // Export items with specific columns based on cell type
      await exportTenderStatusItems(rcStatus, statusAction, cellType);
      
      showNotification(`Excel file downloaded successfully!`, 'success');
    } catch (error) {
      console.error('Error exporting tender status items:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      showNotification(`Export failed: ${errorMessage}`, 'error');
    } finally {
      cell.classList.remove('exporting');
      cell.style.backgroundColor = '';
      cell.style.opacity = '1';
      cell.style.transform = '';
    }
  });
  
  cell.dataset.hasClickHandler = 'true';
}

/**
 * Export tender status items to Excel with specific columns
 * @param {string} rcStatus - RC Status value from the row
 * @param {string} statusAction - Status Action value from the row
 * @param {string} cellType - Type of cell clicked: 'EDLs', 'Non-EDLs', or 'Total Items'
 */
async function exportTenderStatusItems(rcStatus, statusAction, cellType) {
  try {
    // Build SQL query directly
    const whereConditions = [];
    
    // Always filter for drugs (MCID = 1)
    whereConditions.push('MCID = 1');
    
    // Add RC status filter
    if (rcStatus) {
      // Escape single quotes in rcStatus
      const escapedRcStatus = rcStatus.replace(/'/g, "''");
      whereConditions.push(`RCSTATUSITEM = '${escapedRcStatus}'`);
    }
    
    // Add item status filter
    if (statusAction) {
      // Escape single quotes in statusAction
      const escapedStatusAction = statusAction.replace(/'/g, "''");
      whereConditions.push(`ITEMSTATUS = '${escapedStatusAction}'`);
    }
    
    // Add EDL filter based on cell type
    if (cellType === 'EDLs') {
      whereConditions.push(`ISEDL2025 = 'Yes'`);
    } else if (cellType === 'Non-EDLs') {
      whereConditions.push(`(ISEDL2025 != 'Yes' OR ISEDL2025 IS NULL)`);
    }
    // For Total Items, no EDL filter is added
    
    // Build complete SQL query
    const sqlQuery = `SELECT MCATEGORY, ITEMID, ITEMCODE, ITEMNAME, STRENGTH, UNIT, ISEDL2021, ISEDL2025, ITEMSTATUS, DAYREMAININGITEM FROM MV_tender_dashboard WHERE ${whereConditions.join(' AND ')}`;
    
    console.log('Direct SQL query:', sqlQuery);
    console.log('Filters:', { rcStatus, statusAction, cellType });
    
    // Call API with direct SQL - use same API URL as chat
    const apiUrl = process.env.REACT_APP_CHAT_API_URL || process.env.REACT_APP_API_BASE_URL || '';
    if (!apiUrl) {
      throw new Error('API URL not configured. Please set REACT_APP_CHAT_API_URL or REACT_APP_API_BASE_URL');
    }
    
    console.log('Calling API:', apiUrl);
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direct_sql: sqlQuery })
      });
    } catch (fetchError) {
      console.error('Network error:', fetchError);
      throw new Error(`Network error: ${fetchError.message}. Please check your internet connection and API URL.`);
    }
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `Unable to read error response: ${e.message}`;
      }
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    let data;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      throw new Error(`Invalid JSON response from server. Please check the API endpoint.`);
    }
    console.log('API response:', data);
    console.log('API response type:', typeof data);
    console.log('API response keys:', Object.keys(data || {}));
    
    // Handle different response formats from direct_sql endpoint
    let itemsData = null;
    let columns = null;
    
    // The direct_sql endpoint returns: { data: sql_result, sql: sql_query }
    // sql_result from execute_sql can be in different formats:
    // 1. MCP format: {success: true, result: {columns: [...], rows: [[...], ...]}}
    // 2. Array of objects: [{col1: val1, col2: val2}, ...]
    // 3. Object with 'rows': {rows: [...], columns: [...]}
    // 4. Object with 'data': {data: [...], columns: [...]}
    // 5. Object with 'results': {results: [...]}
    // 6. Error object: {error: "..."}
    
    // Check for error first
    if (data.error) {
      throw new Error(`SQL execution error: ${data.error}`);
    }
    
    // Check for data.data.result format (MCP response format - array of arrays) - CHECK THIS FIRST
    if (data.data && data.data.result) {
      if (data.data.result.rows && Array.isArray(data.data.result.rows)) {
        itemsData = data.data.result.rows;
        columns = data.data.result.columns;
        console.log('Found items in data.data.result.rows (MCP array format):', itemsData.length);
        console.log('Columns:', columns);
      }
    }
    // Check for other data.data formats
    else if (data.data) {
      // Case 1: data.data is an array
      if (Array.isArray(data.data)) {
        itemsData = data.data;
        console.log('Found items in data.data (array):', itemsData.length);
      }
      // Case 2: data.data is an object with rows
      else if (data.data.rows && Array.isArray(data.data.rows)) {
        itemsData = data.data.rows;
        columns = data.data.columns;
        console.log('Found items in data.data.rows:', itemsData.length);
        if (columns) console.log('Columns:', columns);
      }
      // Case 3: data.data is an object with data property
      else if (data.data.data && Array.isArray(data.data.data)) {
        itemsData = data.data.data;
        console.log('Found items in data.data.data:', itemsData.length);
      }
      // Case 4: data.data is an object with results property
      else if (data.data.results && Array.isArray(data.data.results)) {
        itemsData = data.data.results;
        console.log('Found items in data.data.results:', itemsData.length);
      }
      // Case 5: Check if data.data itself is an object that might be a single row
      else if (typeof data.data === 'object' && !Array.isArray(data.data)) {
        // Check if it has any of our required columns
        const requiredColumns = ['MCATEGORY', 'ITEMID', 'ITEMCODE', 'ITEMNAME'];
        const hasRequiredCols = requiredColumns.some(col => col in data.data);
        if (hasRequiredCols) {
          itemsData = [data.data]; // Wrap single object in array
          console.log('Found single item in data.data (object)');
        }
      }
    }
    // Check if data has rows directly
    else if (data.rows && Array.isArray(data.rows)) {
      itemsData = data.rows;
      columns = data.columns;
      console.log('Found items in data.rows:', itemsData.length);
      if (columns) console.log('Columns:', columns);
    }
    // Check if data itself is an array
    else if (Array.isArray(data)) {
      itemsData = data;
      console.log('Found items in data (array):', itemsData.length);
    }
    
    if (!itemsData || itemsData.length === 0) {
      console.warn('No items found in response. Full response:', JSON.stringify(data, null, 2));
      console.warn('Response structure:', {
        hasData: !!data.data,
        dataType: typeof data.data,
        isArray: Array.isArray(data.data),
        keys: data.data ? Object.keys(data.data) : []
      });
      throw new Error('No items found matching the criteria. Please check the console for details.');
    }
    
    console.log(`Found ${itemsData.length} items to process`);
    
    // Convert array of arrays to array of objects if needed (MCP response format)
    if (itemsData.length > 0 && Array.isArray(itemsData[0])) {
      console.log('Converting array of arrays to array of objects...');
      if (!columns) {
        // Use required columns if columns not provided
        columns = ['MCATEGORY', 'ITEMID', 'ITEMCODE', 'ITEMNAME', 'STRENGTH', 
                  'UNIT', 'ISEDL2021', 'ISEDL2025', 'ITEMSTATUS', 'DAYREMAININGITEM'];
        console.log('Using default columns:', columns);
      }
      itemsData = itemsData.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
          obj[col] = row[index] !== null && row[index] !== undefined ? row[index] : '';
        });
        return obj;
      });
      console.log(`Converted ${itemsData.length} rows to objects`);
      if (itemsData.length > 0) {
        console.log('First converted item:', itemsData[0]);
      }
    }
    
    // Log first item structure to debug
    if (itemsData.length > 0) {
      console.log('First item structure:', itemsData[0]);
      console.log('First item keys:', Object.keys(itemsData[0]));
    }
    
    // Required columns in exact order
    const requiredColumns = [
      'MCATEGORY', 'ITEMID', 'ITEMCODE', 'ITEMNAME', 'STRENGTH', 
      'UNIT', 'ISEDL2021', 'ISEDL2025', 'ITEMSTATUS', 'DAYREMAININGITEM'
    ];
    
    // Map items to required columns (data should already be in correct format from SQL)
    const items = itemsData.map((item, index) => {
      const mappedItem = {};
      requiredColumns.forEach(col => {
        // Try different case variations and column name formats
        let value = item[col] || 
                   item[col.toUpperCase()] || 
                   item[col.toLowerCase()] ||
                   item[col.charAt(0).toUpperCase() + col.slice(1).toLowerCase()] ||
                   '';
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        mappedItem[col] = value;
      });
      
      // Log first mapped item for debugging
      if (index === 0) {
        console.log('First mapped item:', mappedItem);
      }
      
      return mappedItem;
    });
    
    if (items.length === 0) {
      throw new Error('No items found after processing.');
    }
    
    console.log(`Exporting ${items.length} items to Excel`);
    
    // Generate Excel with specific columns
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cellTypeSafe = cellType.replace(/\s+/g, '_');
    const filename = `Tender_Status_${cellTypeSafe}_${timestamp}.xlsx`;
    await generateExcelFromData(items, filename, requiredColumns);
    
  } catch (error) {
    console.error('Error in exportTenderStatusItems:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
}

/**
 * Custom hook for rendering markdown in messages
 */
export function useMarkdownRenderer(containerRef, messages) {
  /**
   * Add click handlers to tender status table cells (EDLs, Non-EDLs, Total Items) for Excel export
   */
  const addTenderStatusRowClickHandlers = useCallback((container, messages) => {
    if (!container) return;
    
    const tables = container.querySelectorAll('.markdown-table');
    tables.forEach(table => {
      // Check if this is a tender status table (has RC_Status, Status_Action, EDLs, Non_EDLs, Total_Items columns)
      const headerRow = table.querySelector('thead tr, tr:first-child');
      if (!headerRow) return;
      
      const headers = Array.from(headerRow.querySelectorAll('th, td'))
        .map(th => th.textContent.trim());
      
      const isTenderStatusTable = headers.some(h => 
        h.includes('RC Status') || h.includes('RC_Status') || 
        h.includes('Status Action') || h.includes('Status_Action') ||
        h.includes('EDLs') || h.includes('Total Items') || h.includes('Total_Items')
      );
      
      if (isTenderStatusTable) {
        // Find indices of clickable columns and filter columns
        const rcStatusIndex = headers.findIndex(h => 
          h.includes('RC Status') || h.includes('RC_Status')
        );
        const statusActionIndex = headers.findIndex(h => 
          h.includes('Status Action') || h.includes('Status_Action') || 
          h.includes('Tender_Progress') || h.includes('Tender Progress')
        );
        const edlsIndex = headers.findIndex(h => 
          (h.includes('EDLs') || h.includes('EDL')) && 
          !h.includes('Non') && !h.includes('Total')
        );
        const nonEdlsIndex = headers.findIndex(h => 
          h.includes('Non') && (h.includes('EDLs') || h.includes('EDL'))
        );
        const totalItemsIndex = headers.findIndex(h => 
          h.includes('Total Items') || h.includes('Total_Items') || 
          (h.includes('Total') && h.includes('Item'))
        );
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          
          // Extract row data
          const rowData = {};
          headers.forEach((header, idx) => {
            if (cells[idx]) {
              rowData[header] = cells[idx].textContent.trim();
            }
          });
          
          // Make EDLs cell clickable
          if (edlsIndex >= 0 && cells[edlsIndex]) {
            makeCellClickable(cells[edlsIndex], 'EDLs', rowData, headers, rcStatusIndex, statusActionIndex);
          }
          
          // Make Non-EDLs cell clickable
          if (nonEdlsIndex >= 0 && cells[nonEdlsIndex]) {
            makeCellClickable(cells[nonEdlsIndex], 'Non-EDLs', rowData, headers, rcStatusIndex, statusActionIndex);
          }
          
          // Make Total Items cell clickable
          if (totalItemsIndex >= 0 && cells[totalItemsIndex]) {
            makeCellClickable(cells[totalItemsIndex], 'Total Items', rowData, headers, rcStatusIndex, statusActionIndex);
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || typeof window.marked === 'undefined') return;

    // Render markdown in message text
    const messageTexts = containerRef.current.querySelectorAll('.message-text');
    messageTexts.forEach(element => {
      if (!element.dataset.markdownRendered) {
        const html = window.marked.parse(element.textContent);
        element.innerHTML = html;
        element.dataset.markdownRendered = 'true';
      }
    });

    // Process tables after rendering - wrap them and add classes
    processTables(containerRef.current);
    
    // Add click handlers to tender status table rows
    addTenderStatusRowClickHandlers(containerRef.current, messages);
  }, [messages, containerRef, addTenderStatusRowClickHandlers]);

  /**
   * Process tables: wrap in scroll containers and add markdown-table class
   */
  function processTables(container) {
    if (!container) return;

    const messageBubbles = container.querySelectorAll('.message-bubble');
    messageBubbles.forEach(bubble => {
      const tables = bubble.querySelectorAll('table:not(.table-scroll-container table)');
      tables.forEach(table => {
        // Add markdown-table class if not present
        if (!table.classList.contains('markdown-table')) {
          table.classList.add('markdown-table');
        }

        // Wrap in scroll container if not already wrapped
        if (table.parentElement && !table.parentElement.classList.contains('table-scroll-container')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'table-scroll-container';
          wrapper.setAttribute('data-scroll-container', 'true');
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
      });
    });
  }
}

