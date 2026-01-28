# Excel Export Testing Guide

## Overview
This document describes how to test the Excel export functionality for tender status items before deploying to production.

## Test File Location
- **Test HTML File**: `public/test-export.html`
- **Open in Browser**: Navigate to `http://localhost:3000/test-export.html` (or your dev server URL)

## Prerequisites
1. Development server running
2. API endpoint accessible
3. Browser with JavaScript enabled

## Testing Steps

### 1. Open Test Page
- Navigate to `http://localhost:3000/test-export.html` in your browser
- The page will automatically try to load the API URL from environment variables

### 2. Configure API URL
- If API URL is not auto-loaded, enter it manually in the "API URL" field
- Click "Load from Env" to try loading from environment
- Click "Test Connection" to verify the API is accessible

### 3. Test Table Click Export
- The page displays a sample tender status table
- Click on any **EDLs**, **Non-EDLs**, or **Total Items** cell
- The export should trigger automatically
- Check the logs section for detailed information

### 4. Test Manual Export
- Enter values in the "Manual SQL Test" section:
  - **RC Status**: e.g., "RC Valid", "RC Not Valid"
  - **Status Action**: e.g., "Fresh Tender", "Re-Tender", "Bid Found"
  - **Cell Type**: Select from dropdown (EDLs, Non-EDLs, Total Items)
- Click "Test Export" button
- Check logs and verify Excel download

### 5. Review Logs
- All API calls, SQL queries, and responses are logged
- Check for:
  - ✅ Successful API calls
  - ✅ Correct SQL query generation
  - ✅ Proper data extraction
  - ✅ Excel file generation
  - ❌ Any errors or warnings

## What to Check

### ✅ Success Indicators
1. **API Connection**: Connection test should succeed
2. **SQL Query**: Should be properly formatted with correct WHERE conditions
3. **Data Extraction**: Should find items in the response
4. **Excel Download**: File should download with correct filename
5. **Excel Content**: Should contain 10 columns in correct order:
   - MCATEGORY
   - ITEMID
   - ITEMCODE
   - ITEMNAME
   - STRENGTH
   - UNIT
   - ISEDL2021
   - ISEDL2025
   - ITEMSTATUS
   - DAYREMAININGITEM

### ❌ Common Issues

1. **"Failed to fetch"**
   - Check API URL is correct
   - Verify CORS is enabled on backend
   - Check network connectivity

2. **"No items found"**
   - Check SQL query in logs
   - Verify filter values match database values exactly
   - Check API response structure in logs

3. **"Invalid JSON response"**
   - Check API endpoint returns valid JSON
   - Verify backend is handling `direct_sql` parameter

4. **Excel file empty or wrong columns**
   - Check data mapping in logs
   - Verify column names match database columns
   - Check first item structure in logs

## Test Cases

### Test Case 1: EDLs Export
- **RC Status**: "RC Valid"
- **Status Action**: "RC Valid"
- **Cell Type**: "EDLs"
- **Expected**: Excel with items where ISEDL2025 = 'Yes'

### Test Case 2: Non-EDLs Export
- **RC Status**: "RC Not Valid"
- **Status Action**: "Fresh Tender"
- **Cell Type**: "Non-EDLs"
- **Expected**: Excel with items where ISEDL2025 != 'Yes' or IS NULL

### Test Case 3: Total Items Export
- **RC Status**: "RC Not Valid"
- **Status Action**: "Re-Tender"
- **Cell Type**: "Total Items"
- **Expected**: Excel with all items (no EDL filter)

### Test Case 4: Edge Cases
- Test with empty/null values
- Test with special characters in status values
- Test with very large result sets

## Debugging Tips

1. **Check Browser Console**: Open DevTools (F12) for detailed error messages
2. **Check Network Tab**: Verify API request/response in Network tab
3. **Check Logs Section**: All operations are logged with timestamps
4. **Verify SQL Query**: Copy SQL from logs and test directly in database
5. **Check API Response**: Verify response structure matches expected format

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] All test cases pass
- [ ] API URL is correctly configured
- [ ] Error handling works correctly
- [ ] Excel files download with correct format
- [ ] Column order matches requirements
- [ ] Performance is acceptable (large datasets)
- [ ] No console errors
- [ ] CORS is properly configured
- [ ] Backend `direct_sql` endpoint is working

## Notes

- The test file uses the same export logic as production code
- All logs are displayed in the browser for easy debugging
- Test file can be used for ongoing testing and validation
- Keep test file updated with production code changes
