import { useEffect, useCallback } from 'react';
import { generateExcelFromTemplate } from '../utils/excelGenerator';
import { showNotification } from '../utils/notifications';

/**
 * Make a table cell clickable for Excel export
 */
function makeCellClickable(cell, cellType, rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue = null, tenderProgressValue = null, statusActionValue = null) {
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
      // Use direct values passed as parameters (most reliable)
      // Fallback to rowData lookup if direct values not provided
      let rcStatus = rcStatusValue || rowData._rcStatus || null;
      let tenderProgress = tenderProgressValue || rowData._tenderProgress || null;
      let statusAction = statusActionValue || rowData._statusAction || null;
      
      // If still not found, try extracting from rowData using header names
      if (!rcStatus && rcStatusIndex >= 0 && headers[rcStatusIndex]) {
        const rcStatusHeader = headers[rcStatusIndex].trim();
        rcStatus = rowData[rcStatusHeader] || rowData[headers[rcStatusIndex]];
      }
      
      if (!tenderProgress && tenderProgressIndex >= 0 && headers[tenderProgressIndex]) {
        const tenderProgressHeader = headers[tenderProgressIndex].trim();
        tenderProgress = rowData[tenderProgressHeader] || rowData[headers[tenderProgressIndex]];
      }
      
      if (!statusAction && statusActionIndex >= 0 && headers[statusActionIndex]) {
        const statusActionHeader = headers[statusActionIndex].trim();
        statusAction = rowData[statusActionHeader] || rowData[headers[statusActionIndex]];
      }
      
      // Final fallback: search rowData keys
      if (!rcStatus) {
        const rcStatusKey = Object.keys(rowData).find(key => 
          (key.includes('RC Status') || key.includes('RC_Status')) && !key.startsWith('_')
        );
        if (rcStatusKey) rcStatus = rowData[rcStatusKey];
      }
      
      if (!tenderProgress) {
        const tenderProgressKey = Object.keys(rowData).find(key => 
          ((key.includes('Tender Progress') || key.includes('Tender_Progress') || 
           (key.includes('Progress') && key.includes('Remarks'))) && !key.startsWith('_'))
        );
        if (tenderProgressKey) tenderProgress = rowData[tenderProgressKey];
      }
      
      if (!statusAction) {
        const statusActionKey = Object.keys(rowData).find(key => 
          (key.includes('Status Action') || key.includes('Status_Action') || 
           key.includes('Status/Action')) && !key.startsWith('_')
        );
        if (statusActionKey) statusAction = rowData[statusActionKey];
      }
      
      console.log('Row-wise filters for export:', { 
        rcStatus, 
        tenderProgress,
        statusAction, 
        cellType,
        rcStatusValue,
        tenderProgressValue,
        statusActionValue,
        rowDataKeys: Object.keys(rowData).filter(k => !k.startsWith('_'))
      });
      
      // Determine ABC category if clicking on ABC category cells
      let abcCategory = null;
      if (cellType === 'A-Cat' || cellType === 'A-Category') {
        abcCategory = 'A';
      } else if (cellType === 'B-Cat' || cellType === 'B-Category') {
        abcCategory = 'B';
      } else if (cellType === 'C-Cat' || cellType === 'C-Category') {
        abcCategory = 'C';
      }
      
      showNotification(`Fetching ${cellType} items${rcStatus ? ` (RC: ${rcStatus})` : ''}${tenderProgress ? ` (Progress: ${tenderProgress})` : ''}${statusAction ? ` (Status: ${statusAction})` : ''}${abcCategory ? ` (ABC: ${abcCategory})` : ''}...`, 'info');
      
      // Export items with specific columns based on cell type and row conditions
      await exportTenderStatusItems(rcStatus, statusAction, cellType, abcCategory, tenderProgress);
      
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
 * @param {string} cellType - Type of cell clicked: 'EDLs', 'Non-EDLs', 'Total Items', 'A-Cat', 'B-Cat', 'C-Cat', or any other cell type
 * @param {string} abcCategory - ABC category value ('A', 'B', or 'C') when clicking ABC category cells
 * @param {string} tenderProgress - Tender Progress/Remarks value from the row (for DPDMIS overall tender status)
 */
async function exportTenderStatusItems(rcStatus, statusAction, cellType, abcCategory = null, tenderProgress = null) {
  try {
    // Build SQL query directly
    const whereConditions = [];
    
    // Always filter for drugs (MCID = 1)
    whereConditions.push('MCID = 1');
    
    // Always filter for items with quantity > 0
    whereConditions.push('NVL(TOTALAI_QTY, 0) > 0');
    
    // Add RC status filter
    if (rcStatus) {
      // Escape single quotes in rcStatus
      const escapedRcStatus = rcStatus.replace(/'/g, "''");
      whereConditions.push(`RCSTATUSITEM = '${escapedRcStatus}'`);
    }
    
    // Add tender progress/remarks filter (for DPDMIS overall tender status table)
    if (tenderProgress) {
      // Escape single quotes in tenderProgress
      const escapedTenderProgress = tenderProgress.replace(/'/g, "''");
      // Handle transformed TENDERSTATUS values (e.g., "New Items", "Price Opened Bid Not Found")
      // Need to match against the transformed value in the subquery
      // For "New Items", filter by TENDERSTATUS = 'NA'
      // For "Price Opened Bid Not Found", filter by TENDERSTATUS = 'Price Opened' AND no bids
      if (tenderProgress === 'New Items') {
        whereConditions.push(`TENDERSTATUS = 'NA'`);
      } else if (tenderProgress === 'Price Opened Bid Not Found') {
        whereConditions.push(`TENDERSTATUS = 'Price Opened'`);
        whereConditions.push(`(BIDFOUNDINCOVERA = 0 OR BIDFOUNDINCOVERA IS NULL)`);
        whereConditions.push(`(BIDFOUNDINCOVERB = 0 OR BIDFOUNDINCOVERB IS NULL)`);
        whereConditions.push(`(BIDFOUNDINCOVERC = 0 OR BIDFOUNDINCOVERC IS NULL)`);
      } else {
        // For other values, match directly against TENDERSTATUS
        whereConditions.push(`TENDERSTATUS = '${escapedTenderProgress}'`);
      }
    }
    
    // Add item status filter
    if (statusAction) {
      // Escape single quotes in statusAction
      const escapedStatusAction = statusAction.replace(/'/g, "''");
      whereConditions.push(`ITEMSTATUS = '${escapedStatusAction}'`);
    }
    
    // Add EDL filter based on cell type (only for specific EDL-related cell types)
    if (cellType === 'EDLs' || (cellType && cellType.toLowerCase().includes('edl') && !cellType.toLowerCase().includes('non'))) {
      whereConditions.push(`ISEDL2025 = 'Yes'`);
    } else if (cellType === 'Non-EDLs' || (cellType && cellType.toLowerCase().includes('non') && cellType.toLowerCase().includes('edl'))) {
      whereConditions.push(`(ISEDL2025 != 'Yes' OR ISEDL2025 IS NULL)`);
    }
    // For other cell types (Total Items, generic numeric cells, etc.), no EDL filter is added
    
    // Add ABC category filter if clicking on ABC category cells
    if (abcCategory && (cellType === 'A-Cat' || cellType === 'B-Cat' || cellType === 'C-Cat' || cellType === 'A-Category' || cellType === 'B-Category' || cellType === 'C-Category')) {
      whereConditions.push(`ABCINDENTVALUE = '${abcCategory}'`);
    }
    
    // For "Total (A+B+C)" cell, filter by all ABC categories
    if (cellType === 'Total (A+B+C)') {
      whereConditions.push(`ABCINDENTVALUE IN ('A', 'B', 'C')`);
    }
    
    // Build complete SQL query with all 50 columns from MV_tender_dashboard
    // Column order as specified by user: RCSTATUSITEM, TENDERSTATUS, ITEMSTATUS, TENDERSCHEMECODE, ITEMID, INDENTVALUE, EDL, EDLVALUE, NONEDL, NONEDLVALUE, ABOVEBELOW, ITEMCODE, ITEMNAME, STRENGTH, UNIT, ITEMTYPENAME, GROUPNAME, EDLTYPE, RCSTARTITEM, RCENDDTITEM, LASTRCSCHEMECODE, DAYREMAININGITEM, LASTFLOATEDTENDERCODE, TENDERSTARTDT, SUBMISSIONLASTDT, COV_A_OPDATE, BIDFOUNDINCOVERA, CLAIMOBJSTARTDT, CLAIMOBJECTION_LAST, COV_B_OPDATE, PRICEBIDDATE, ABCACT, BIDFOUNDINCOVERB, BIDFOUNDINCOVERC, LEAD_TIME, RC_PRC_APPROXRATE, TOTALAI_QTY, DHSAI_QTY, CMEAI_QTY, VEDCAT, ACCEPTEDDT, YEARLY_ISSUE_QTY, YEARLY_NOC_QTY, TOTALSTOCK_INCPIPELINE, MIN_BATCH_SUPPLIED, READY_STOCK, IWHPIPE_STOCK, UQC_STOCK, PIPELINESTOCK, IPHSCTYPE, PRCENDDT, LASTRCEXTENEDUPTODT
    const sqlQuery = `SELECT 
      RCSTATUSITEM,
      TENDERSTATUS,
      ITEMSTATUS,
      TENDERSCHEMECODE,
      ITEMID,
      NVL(INDENTVALUEINRS, NVL(TOTALAI_QTY, 0) * NVL(RC_PRC_APPROXRATE, 0)) AS INDENTVALUE,
      CASE WHEN ISEDL2025 = 'Yes' THEN 'Yes' ELSE 'No' END AS EDL,
      CASE WHEN ISEDL2025 = 'Yes' THEN NVL(INDENTVALUEINRS, NVL(TOTALAI_QTY, 0) * NVL(RC_PRC_APPROXRATE, 0)) ELSE 0 END AS EDLVALUE,
      CASE WHEN NVL(ISEDL2025, 'No') != 'Yes' THEN 'Yes' ELSE 'No' END AS NONEDL,
      CASE WHEN NVL(ISEDL2025, 'No') != 'Yes' THEN NVL(INDENTVALUEINRS, NVL(TOTALAI_QTY, 0) * NVL(RC_PRC_APPROXRATE, 0)) ELSE 0 END AS NONEDLVALUE,
      CASE WHEN NVL(INDENTVALUEINRS, NVL(TOTALAI_QTY, 0) * NVL(RC_PRC_APPROXRATE, 0)) >= 100000 THEN 'Above 1L' ELSE 'Below 1L' END AS ABOVEBELOW,
      ITEMCODE,
      ITEMNAME,
      STRENGTH,
      UNIT,
      ITEMTYPENAME,
      GROUPNAME,
      CASE WHEN ISEDL2025 = 'Yes' THEN 'EDL' ELSE 'Non EDL' END AS EDLTYPE,
      RCSTARTITEM,
      RCENDDTITEM,
      LASTRCSCHEMECODE,
      DAYREMAININGITEM,
      LASTFLOATEDTENDERCODE,
      TENDERSTARTDT,
      SUBMISSIONLASTDT,
      COV_A_OPDATE,
      BIDFOUNDINCOVERA,
      CLAIMOBJSTARTDT,
      CLAIMOBJECTION_LAST,
      COV_B_OPDATE,
      PRICEBIDDATE,
      ABCINDENTVALUE AS ABCACT,
      BIDFOUNDINCOVERB,
      BIDFOUNDINCOVERC,
      LEAD_TIME,
      RC_PRC_APPROXRATE,
      TOTALAI_QTY,
      DHSAI_QTY,
      CMEAI_QTY,
      VEDCATEGORY AS VEDCAT,
      ACCEPTEDDT,
      NULL AS YEARLY_ISSUE_QTY,
      NULL AS YEARLY_NOC_QTY,
      NULL AS TOTALSTOCK_INCPIPELINE,
      NULL AS MIN_BATCH_SUPPLIED,
      NULL AS READY_STOCK,
      NULL AS IWHPIPE_STOCK,
      NULL AS UQC_STOCK,
      NULL AS PIPELINESTOCK,
      NULL AS IPHSCTYPE,
      PRCENDDT,
      LASTRCEXTENEDUPTODT
    FROM MV_tender_dashboard WHERE ${whereConditions.join(' AND ')} ORDER BY RCSTATUSITEM, ITEMSTATUS, TENDERSTATUS, ITEMCODE`;
    
    console.log('=== Excel Export - Row-wise Filters ===');
    console.log('RC Status filter:', rcStatus || 'None (all RC statuses)');
    console.log('Tender Progress filter:', tenderProgress || 'None (all tender progress)');
    console.log('Status Action filter:', statusAction || 'None (all statuses)');
    console.log('Cell Type filter:', cellType);
    console.log('ABC Category filter:', abcCategory || 'None (all ABC categories)');
    console.log('WHERE conditions:', whereConditions);
    console.log('Direct SQL query:', sqlQuery);
    console.log('========================================');
    
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
        // Use required columns matching the 50 columns from MV_tender_dashboard
        columns = [
          'RCSTATUSITEM', 'TENDERSTATUS', 'ITEMSTATUS', 'TENDERSCHEMECODE', 'ITEMID', 'INDENTVALUE', 'EDL', 'EDLVALUE', 'NONEDL', 'NONEDLVALUE',
          'ABOVEBELOW', 'ITEMCODE', 'ITEMNAME', 'STRENGTH', 'UNIT', 'ITEMTYPENAME', 'GROUPNAME', 'EDLTYPE', 'RCSTARTITEM', 'RCENDDTITEM',
          'LASTRCSCHEMECODE', 'DAYREMAININGITEM', 'LASTFLOATEDTENDERCODE', 'TENDERSTARTDT', 'SUBMISSIONLASTDT', 'COV_A_OPDATE', 'BIDFOUNDINCOVERA',
          'CLAIMOBJSTARTDT', 'CLAIMOBJECTION_LAST', 'COV_B_OPDATE', 'PRICEBIDDATE', 'ABCACT', 'BIDFOUNDINCOVERB', 'BIDFOUNDINCOVERC', 'LEAD_TIME',
          'RC_PRC_APPROXRATE', 'TOTALAI_QTY', 'DHSAI_QTY', 'CMEAI_QTY', 'VEDCAT', 'ACCEPTEDDT', 'YEARLY_ISSUE_QTY', 'YEARLY_NOC_QTY',
          'TOTALSTOCK_INCPIPELINE', 'MIN_BATCH_SUPPLIED', 'READY_STOCK', 'IWHPIPE_STOCK', 'UQC_STOCK', 'PIPELINESTOCK', 'IPHSCTYPE', 'PRCENDDT', 'LASTRCEXTENEDUPTODT'
        ];
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
    
    // Required columns in exact order matching the 50 columns from MV_tender_dashboard
    const requiredColumns = [
      'RCSTATUSITEM', 'TENDERSTATUS', 'ITEMSTATUS', 'TENDERSCHEMECODE', 'ITEMID', 'INDENTVALUE', 'EDL', 'EDLVALUE', 'NONEDL', 'NONEDLVALUE',
      'ABOVEBELOW', 'ITEMCODE', 'ITEMNAME', 'STRENGTH', 'UNIT', 'ITEMTYPENAME', 'GROUPNAME', 'EDLTYPE', 'RCSTARTITEM', 'RCENDDTITEM',
      'LASTRCSCHEMECODE', 'DAYREMAININGITEM', 'LASTFLOATEDTENDERCODE', 'TENDERSTARTDT', 'SUBMISSIONLASTDT', 'COV_A_OPDATE', 'BIDFOUNDINCOVERA',
      'CLAIMOBJSTARTDT', 'CLAIMOBJECTION_LAST', 'COV_B_OPDATE', 'PRICEBIDDATE', 'ABCACT', 'BIDFOUNDINCOVERB', 'BIDFOUNDINCOVERC', 'LEAD_TIME',
      'RC_PRC_APPROXRATE', 'TOTALAI_QTY', 'DHSAI_QTY', 'CMEAI_QTY', 'VEDCAT', 'ACCEPTEDDT', 'YEARLY_ISSUE_QTY', 'YEARLY_NOC_QTY',
      'TOTALSTOCK_INCPIPELINE', 'MIN_BATCH_SUPPLIED', 'READY_STOCK', 'IWHPIPE_STOCK', 'UQC_STOCK', 'PIPELINESTOCK', 'IPHSCTYPE', 'PRCENDDT', 'LASTRCEXTENEDUPTODT'
    ];
    
    // Map items to required columns (data should already be in correct format from SQL with aliases)
    const items = itemsData.map((item, index) => {
      const mappedItem = {};
      requiredColumns.forEach(col => {
        // Try exact match first, then case variations
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
    
    console.log(`Exporting ${items.length} items to Excel using template`);
    
    // Generate Excel from template with specific columns
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cellTypeSafe = cellType.replace(/\s+/g, '_');
    const filename = `Tender_Status_${cellTypeSafe}_${timestamp}.xlsx`;
    
    // Use template-based export (preserves formatting, styles, formulas)
    await generateExcelFromTemplate(
      items,
      '/templates/Tender_Items_Template.xlsx',
      filename,
      requiredColumns,
      {
        sheetName: null, // Use first sheet
        dataStartRow: 2, // Data starts at row 2 (row 1 has headers)
        headerRow: 1
      }
    );
    
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
        h.includes('Status Action') || h.includes('Status_Action') || h.includes('Status/Action') ||
        h.includes('EDLs') || h.includes('Total Items') || h.includes('Total_Items') ||
        h.includes('A-Category') || h.includes('B-Category') || h.includes('C-Category') ||
        h.includes('A- Cat') || h.includes('B- Cat') || h.includes('C- Cat') ||
        h.includes('Total (A+B+C)')
      );
      
      if (isTenderStatusTable) {
        // Find indices of clickable columns and filter columns
        const rcStatusIndex = headers.findIndex(h => 
          h.includes('RC Status') || h.includes('RC_Status')
        );
        // Find Tender Progress/Remarks column (separate from Status Action)
        const tenderProgressIndex = headers.findIndex(h => {
          const normalized = h.replace('/', ' ').replace('_', ' ');
          return (
            normalized.includes('Tender Progress') ||
            normalized.includes('Tender_Progress') ||
            normalized.includes('Tender Progress Remarks') ||
            normalized.includes('Tender_Progress_Remarks') ||
            (normalized.includes('Progress') && normalized.includes('Remarks'))
          );
        });
        // Find Status Action column (separate from Tender Progress)
        const statusActionIndex = headers.findIndex(h => {
          const normalized = h.replace('/', ' ');
          return (
            h.includes('Status/Action') ||
            h === 'Status/Action' ||
            normalized.includes('Status Action') ||
            normalized.includes('Status_Action') ||
            normalized.includes('Status Action to be Taken') ||
            normalized.includes('Status_Action_to_be_Taken')
          );
        });
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
        // Find ABC category column indices (flexible matching for "A- Cat on ABC", "B- Cat on ABC", "C- Cat on ABC", "A-Category", "B-Category", "C-Category", etc.)
        // Must match pattern: A/B/C followed by "-" or " " and "Cat" or "CAT" or "Category", and optionally "on ABC" or "ABC"
        const aCatIndex = headers.findIndex(h => {
          const normalized = h.toUpperCase().trim();
          // Match patterns like "A- Cat", "A Cat", "A-Cat", "A_Cat", "A- Cat on ABC", "A-Category", etc.
          return ((normalized.startsWith('A') || normalized.includes(' A ')) && 
                 (normalized.includes('CAT') || normalized.includes('ABC') || normalized.includes('CATEGORY'))) &&
                 !normalized.includes('INDENT') && !normalized.includes('VALUE') && !normalized.includes('TOTAL');
        });
        const bCatIndex = headers.findIndex(h => {
          const normalized = h.toUpperCase().trim();
          // Match patterns like "B- Cat", "B Cat", "B-Cat", "B_Cat", "B- Cat on ABC", "B-Category", etc.
          return ((normalized.startsWith('B') || normalized.includes(' B ')) && 
                 (normalized.includes('CAT') || normalized.includes('ABC') || normalized.includes('CATEGORY'))) &&
                 !normalized.includes('INDENT') && !normalized.includes('VALUE') && !normalized.includes('TOTAL');
        });
        const cCatIndex = headers.findIndex(h => {
          const normalized = h.toUpperCase().trim();
          // Match patterns like "C- Cat", "C Cat", "C-Cat", "C_Cat", "C- Cat on ABC", "C-Category", etc.
          return ((normalized.startsWith('C') || normalized.includes(' C ')) && 
                 (normalized.includes('CAT') || normalized.includes('ABC') || normalized.includes('CATEGORY'))) &&
                 !normalized.includes('INDENT') && !normalized.includes('VALUE') && !normalized.includes('TOTAL');
        });
        // Find "Total (A+B+C)" column index
        const totalAbcIndex = headers.findIndex(h => {
          const normalized = h.toUpperCase().trim();
          return (normalized.includes('TOTAL') && (normalized.includes('A+B+C') || normalized.includes('A+B+C'))) ||
                 (normalized.includes('TOTAL') && normalized.includes('ABC'));
        });
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, rowIdx) => {
          const cells = Array.from(row.querySelectorAll('td'));
          
          // Extract row data - ensure we capture all cell values correctly
          const rowData = {};
          headers.forEach((header, idx) => {
            if (cells[idx]) {
              const cellValue = cells[idx].textContent.trim();
              rowData[header] = cellValue;
              // Also store with normalized key for easier lookup
              rowData[header.trim()] = cellValue;
            }
          });
          
          // Extract actual filter values from cells directly (more reliable)
          const rcStatusValue = (rcStatusIndex >= 0 && cells[rcStatusIndex]) ? cells[rcStatusIndex].textContent.trim() : null;
          
          // Skip GRAND TOTAL rows (rows where RC Status contains "GRAND TOTAL")
          if (rcStatusValue && rcStatusValue.toUpperCase().includes('GRAND TOTAL')) {
            return; // Skip this row
          }
          
          const tenderProgressValue = (tenderProgressIndex >= 0 && cells[tenderProgressIndex]) ? cells[tenderProgressIndex].textContent.trim() : null;
          const statusActionValue = (statusActionIndex >= 0 && cells[statusActionIndex]) ? cells[statusActionIndex].textContent.trim() : null;
          
          // Store row indices for debugging
          rowData._rowIndex = rowIdx;
          rowData._rcStatusIndex = rcStatusIndex;
          rowData._statusActionIndex = statusActionIndex;
          
          // Store direct values in rowData for easier access
          rowData._rcStatus = rcStatusValue;
          rowData._tenderProgress = tenderProgressValue;
          rowData._statusAction = statusActionValue;
          
          console.log(`Row ${rowIdx} data:`, {
            rcStatus: rcStatusValue,
            tenderProgress: tenderProgressValue,
            statusAction: statusActionValue,
            rowDataKeys: Object.keys(rowData),
            headers: headers
          });
          
          // Make ALL numeric cells clickable (not just specific ones)
          // Skip filter columns (RC Status, Tender Progress, Status Action) and header cells
          cells.forEach((cell, cellIdx) => {
            // Skip if this is a filter column (we don't want to make filter columns clickable)
            if (cellIdx === rcStatusIndex || cellIdx === tenderProgressIndex || cellIdx === statusActionIndex) {
              return;
            }
            
            // Skip if already has click handler
            if (cell.dataset.hasClickHandler === 'true') {
              return;
            }
            
            // Get cell value and check if it's numeric
            const cellText = cell.textContent.trim();
            const cellHeader = headers[cellIdx] || '';
            
            // Skip empty cells, "GRAND TOTAL" text, and non-numeric cells
            if (!cellText || cellText.toUpperCase().includes('GRAND TOTAL') || cellText.toUpperCase().includes('TOTAL')) {
              // Allow "Total Items" and similar aggregations to be clickable
              if (!cellText.match(/^\d+$/) && !cellText.match(/^\d+\.\d+$/) && !cellHeader.toLowerCase().includes('total')) {
                return;
              }
            }
            
            // Check if cell contains a number (integer or decimal)
            const isNumeric = /^\d+$/.test(cellText) || /^\d+\.\d+$/.test(cellText) || /^\d+,\d+$/.test(cellText);
            
            // Also make cells clickable if they're in known aggregatable columns (EDLs, Non-EDLs, Total Items, ABC categories, etc.)
            const isAggregatableColumn = 
              (cellIdx === edlsIndex || cellIdx === nonEdlsIndex || cellIdx === totalItemsIndex) ||
              (cellIdx === aCatIndex || cellIdx === bCatIndex || cellIdx === cCatIndex || cellIdx === totalAbcIndex) ||
              (cellHeader.toLowerCase().includes('edl') || cellHeader.toLowerCase().includes('total')) ||
              (cellHeader.toLowerCase().includes('category') || cellHeader.toLowerCase().includes('cat')) ||
              (cellHeader.toLowerCase().includes('value') || cellHeader.toLowerCase().includes('items')) ||
              (cellHeader.toLowerCase().includes('nositems') || cellHeader.toLowerCase().includes('indentvalue'));
            
            if (isNumeric || isAggregatableColumn) {
              // Determine cell type from header or content
              let cellType = 'Items';
              if (cellIdx === edlsIndex || (cellHeader.toLowerCase().includes('edl') && !cellHeader.toLowerCase().includes('non'))) {
                cellType = 'EDLs';
              } else if (cellIdx === nonEdlsIndex || (cellHeader.toLowerCase().includes('non') && cellHeader.toLowerCase().includes('edl'))) {
                cellType = 'Non-EDLs';
              } else if (cellIdx === totalItemsIndex || cellHeader.toLowerCase().includes('total items')) {
                cellType = 'Total Items';
              } else if (cellIdx === aCatIndex || (cellHeader.toLowerCase().includes('a') && (cellHeader.toLowerCase().includes('cat') || cellHeader.toLowerCase().includes('category')))) {
                cellType = 'A-Cat';
              } else if (cellIdx === bCatIndex || (cellHeader.toLowerCase().includes('b') && (cellHeader.toLowerCase().includes('cat') || cellHeader.toLowerCase().includes('category')))) {
                cellType = 'B-Cat';
              } else if (cellIdx === cCatIndex || (cellHeader.toLowerCase().includes('c') && (cellHeader.toLowerCase().includes('cat') || cellHeader.toLowerCase().includes('category')))) {
                cellType = 'C-Cat';
              } else if (cellIdx === totalAbcIndex || cellHeader.toLowerCase().includes('total (a+b+c)')) {
                cellType = 'Total (A+B+C)';
              } else {
                // Generic cell type based on header
                cellType = cellHeader || 'Items';
              }
              
              makeCellClickable(cell, cellType, rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
            }
          });
          
          // Keep specific handlers for known columns (for backward compatibility)
          if (edlsIndex >= 0 && cells[edlsIndex] && cells[edlsIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[edlsIndex], 'EDLs', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (nonEdlsIndex >= 0 && cells[nonEdlsIndex] && cells[nonEdlsIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[nonEdlsIndex], 'Non-EDLs', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (totalItemsIndex >= 0 && cells[totalItemsIndex] && cells[totalItemsIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[totalItemsIndex], 'Total Items', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (aCatIndex >= 0 && cells[aCatIndex] && cells[aCatIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[aCatIndex], 'A-Cat', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (bCatIndex >= 0 && cells[bCatIndex] && cells[bCatIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[bCatIndex], 'B-Cat', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (cCatIndex >= 0 && cells[cCatIndex] && cells[cCatIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[cCatIndex], 'C-Cat', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
          }
          
          if (totalAbcIndex >= 0 && cells[totalAbcIndex] && cells[totalAbcIndex].dataset.hasClickHandler !== 'true') {
            makeCellClickable(cells[totalAbcIndex], 'Total (A+B+C)', rowData, headers, rcStatusIndex, tenderProgressIndex, statusActionIndex, rcStatusValue, tenderProgressValue, statusActionValue);
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
