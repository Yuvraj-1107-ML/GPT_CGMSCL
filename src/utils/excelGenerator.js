/**
 * Excel Generator Utility
 * Generates Excel files from tabular data on the frontend
 * Uses xlsx library from CDN for proper XLSX format
 */

/**
 * Load xlsx library from CDN if not already loaded
 * @returns {Promise} Promise that resolves when library is loaded
 */
function loadXLSXLibrary() {
  return new Promise((resolve, reject) => {
    // Check if XLSX is already loaded
    if (window.XLSX) {
      resolve(window.XLSX);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="xlsx"]')) {
      const checkInterval = setInterval(() => {
        if (window.XLSX) {
          clearInterval(checkInterval);
          resolve(window.XLSX);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.XLSX) {
          reject(new Error('XLSX library loading timeout'));
        }
      }, 10000);
      return;
    }

    // Load xlsx library from CDN (use default if env var not set)
    const script = document.createElement('script');
    const cdnUrl = process.env.REACT_APP_XLSX_CDN_URL || 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.src = cdnUrl;
    
    script.onload = () => {
      // Wait a bit for the library to initialize
      setTimeout(() => {
        if (window.XLSX) {
          resolve(window.XLSX);
        } else {
          reject(new Error('XLSX library failed to initialize after loading'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load XLSX library from CDN: ${cdnUrl}`));
    };
    
    document.head.appendChild(script);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!window.XLSX) {
        reject(new Error('XLSX library loading timeout'));
      }
    }, 10000);
  });
}

/**
 * Convert array of objects or arrays to Excel file (proper XLSX format)
 * @param {Array} data - Array of objects or arrays with data
 * @param {string} filename - Name of the file to download
 * @param {Array} providedHeaders - Optional array of column headers (if data is array of arrays without headers)
 */
export async function generateExcelFromData(data, filename = 'CGMSCL_Query_Results.xlsx', providedHeaders = null) {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data provided or data is empty');
    }

    // Load XLSX library
    const XLSX = await loadXLSXLibrary();

    let headers = [];
    let worksheetData = [];
    
    // Check if data is array of arrays or array of objects
    const firstItem = data[0];
    const isArrayOfArrays = Array.isArray(firstItem);
    
    // Debug: log data structure
    console.log('Excel data structure:', {
      isArrayOfArrays,
      firstItem,
      dataLength: data.length,
      sample: data.slice(0, 2)
    });
    
    if (isArrayOfArrays) {
      // Data is array of arrays
      if (data.length === 0) {
        throw new Error('No data provided');
      }
      
      // Check if headers are provided separately
      if (providedHeaders && Array.isArray(providedHeaders) && providedHeaders.length > 0) {
        // Use provided headers
        headers = providedHeaders.map(h => String(h || 'Column'));
        console.log('Using provided headers:', headers);
        
        // All rows in data are data rows
        worksheetData = [headers];
        data.forEach(row => {
          const paddedRow = headers.map((_, idx) => {
            const val = row && row[idx] !== undefined ? row[idx] : '';
            return val === null || val === undefined ? '' : val;
          });
          worksheetData.push(paddedRow);
        });
      } else {
        // No headers provided - ALL rows are data rows (never treat first row as headers)
        // Generate generic column names based on number of columns
        const numColumns = firstItem ? firstItem.length : 0;
        headers = Array.from({ length: numColumns }, (_, idx) => `Column ${idx + 1}`);
        console.log('No column headers provided from API, using generic names:', headers);
        console.log('Note: All rows including first row are treated as data rows');
        
        // ALL rows in data are data rows (including first row)
        worksheetData = [headers]; // Start with headers row
        data.forEach(row => {
          if (Array.isArray(row)) {
            const paddedRow = headers.map((_, idx) => {
              const val = row && row[idx] !== undefined ? row[idx] : '';
              return val === null || val === undefined ? '' : String(val);
            });
            worksheetData.push(paddedRow);
          }
        });
      }
    } else {
      // Data is array of objects: use object keys as headers
      headers = Object.keys(firstItem);
      
      // Add headers row
      worksheetData.push(headers);
      
      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          return value === null || value === undefined ? '' : value;
        });
        worksheetData.push(values);
      });
    }
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths (auto-width based on content)
    const colWidths = headers.map((header, colIndex) => {
      let maxLength = String(header).length;
      
      // Find max length in this column
      for (let rowIndex = 1; rowIndex < worksheetData.length; rowIndex++) {
        const cellValue = worksheetData[rowIndex][colIndex];
        if (cellValue !== null && cellValue !== undefined) {
          const cellLength = String(cellValue).length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        }
      }
      
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // Generate XLSX file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw error;
  }
}

/**
 * Generate Excel from response text (extracts tables if present)
 * @param {string} responseText - The response text that may contain tables
 * @param {string} filename - Name of the file to download
 */
export async function generateExcelFromResponse(responseText, filename = 'CGMSCL_Query_Results.xlsx') {
  try {
    // Try to extract table data from markdown tables or plain text tables
    const lines = responseText.split('\n');
    const data = [];
    let headers = null;
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for markdown table separator
      if (line.match(/^\|[\s\-|:]+\|$/)) {
        inTable = true;
        continue;
      }
      
      // Check for table row
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        
        if (!headers) {
          headers = cells;
        } else {
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = cells[idx] || '';
          });
          data.push(row);
        }
        inTable = true;
      } else if (inTable && line && !line.startsWith('|')) {
        // End of table
        break;
      }
    }
    
    if (data.length > 0) {
      return await generateExcelFromData(data, filename);
    }
    
    // If no table found, create a simple Excel with the response text
    const simpleData = [{ 'Response': responseText }];
    return await generateExcelFromData(simpleData, filename);
  } catch (error) {
    console.error('Error generating Excel from response:', error);
    throw error;
  }
}

/**
 * Generate Excel from template file and populate with data
 * @param {Array} data - Array of objects with data
 * @param {string} templatePath - Path to template file in public folder
 * @param {string} filename - Output filename
 * @param {Array} columnOrder - Array of column names in the order they appear in template
 * @param {Object} options - Options for template population
 * @param {string} options.sheetName - Sheet name to populate (default: first sheet)
 * @param {number} options.dataStartRow - Row number where data starts (default: 2, assuming row 1 has headers)
 * @param {number} options.headerRow - Row number with headers (default: 1)
 */
export async function generateExcelFromTemplate(
  data, 
  templatePath = '/templates/Tender_Items_Template.xlsx',
  filename = 'CGMSCL_Query_Results.xlsx',
  columnOrder = null,
  options = {}
) {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data provided or data is empty');
    }

    // Load XLSX library
    const XLSX = await loadXLSXLibrary();
    
    // Load template file
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Template file not found: ${templatePath}. Status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Read template workbook with cell styles preserved
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellStyles: true, // Preserve styles
      cellDates: true,  // Handle dates
      sheetStubs: true  // Preserve empty cells
    });
    
    // Get worksheet (default to first sheet or specified sheet name)
    const sheetName = options.sheetName || workbook.SheetNames[0];
    if (!workbook.Sheets[sheetName]) {
      throw new Error(`Sheet "${sheetName}" not found in template. Available sheets: ${workbook.SheetNames.join(', ')}`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Determine data start row (default: row 2, row 1 = headers)
    const dataStartRow = options.dataStartRow || 2;
    const headerRow = options.headerRow || 1;
    
    console.log('Template processing:', {
      sheetName,
      dataStartRow,
      headerRow,
      dataLength: data.length,
      columnOrder
    });
    
    // If column order is provided, use it; otherwise infer from first data object
    const columns = columnOrder || Object.keys(data[0]);
    
    // Apply blue background color to header row
    const headerRowIndex = headerRow - 1; // Convert to 0-indexed
    const blueFillStyle = {
      fill: {
        fgColor: { rgb: "4472C4" } // Blue color (Excel standard blue)
      },
      font: {
        color: { rgb: "FFFFFF" }, // White text for better contrast
        bold: true
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      }
    };
    
    // Apply blue background to all header cells
    columns.forEach((colName, colIndex) => {
      const headerCellAddress = XLSX.utils.encode_cell({ 
        r: headerRowIndex, 
        c: colIndex 
      });
      const headerCell = worksheet[headerCellAddress];
      
      // Merge existing style with blue background
      if (headerCell) {
        worksheet[headerCellAddress].s = {
          ...headerCell.s,
          ...blueFillStyle,
          // Preserve other existing styles
          border: (headerCell.s && headerCell.s.border) || {},
          numFmt: (headerCell.s && headerCell.s.numFmt) || undefined
        };
      } else {
        // If header cell doesn't exist, create it with blue background
        worksheet[headerCellAddress] = {
          t: 's',
          v: colName,
          s: blueFillStyle
        };
      }
    });
    
    // Write data rows
    data.forEach((item, rowIndex) => {
      const excelRow = dataStartRow + rowIndex - 1; // Excel is 0-indexed
      
      columns.forEach((colName, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ 
          r: excelRow, 
          c: colIndex 
        });
        
        // Get value from item
        let value = item[colName];
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Preserve existing cell style if present
        const existingCell = worksheet[cellAddress];
        
        // Determine cell type
        let cellType = 's'; // string by default
        if (typeof value === 'number') {
          cellType = 'n';
        } else if (value instanceof Date) {
          cellType = 'd';
        }
        
        // Create new cell with preserved style
        worksheet[cellAddress] = {
          t: cellType,
          v: value,
          s: (existingCell && existingCell.s) || {} // Preserve existing style
        };
      });
    });
    
    // Update worksheet range if needed
    const currentRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const lastRow = Math.max(currentRange.e.r, dataStartRow + data.length - 2);
    const lastCol = Math.max(currentRange.e.c, columns.length - 1);
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastCol }
    });
    
    // Update worksheet in workbook
    workbook.Sheets[sheetName] = worksheet;
    
    // Generate Excel file with styles preserved
    const excelBuffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx',
      cellStyles: true
    });
    
    // Download file
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`Excel file generated from template: ${filename}`);
    return true;
    
  } catch (error) {
    console.error('Error generating Excel from template:', error);
    throw error;
  }
}