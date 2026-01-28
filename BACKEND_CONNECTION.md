# Backend Connection Guide for CGMSCL React Application

## Overview

The CGMSCL React application connects to a backend API (AWS Lambda) to handle chat queries and data retrieval. This document explains how to configure and connect to the backend.

## Current Backend Implementation

### 1. Main API Endpoint (AWS Lambda)

The application connects to an AWS Lambda function for chat functionality:

**Location:** `src/components/App.js` (lines 87-95)

```javascript
const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL;

const response = await fetch(CHAT_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: trimmed })
});
```

**Backend:** AWS Lambda function (`lambda_function.py`)
- Uses AWS Bedrock (Claude 3.5 Sonnet) for LLM processing
- Connects to MCP (Model Context Protocol) server for SQL execution
- Handles table classification, SQL generation, and response generation
- CORS enabled for all origins

### 2. Environment Variables Required

The application requires the following environment variables:

#### Required Variables:
- `REACT_APP_CHAT_API_URL` - Main chat API endpoint URL

#### Optional Variables:
- `REACT_APP_API_BASE_URL` - Base URL for additional API endpoints (used for Excel downloads)

### 3. Setting Up Environment Variables

#### For Development:

1. The `.env` file has been created with your actual Lambda endpoint:

```env
# AWS Lambda API Gateway endpoint
REACT_APP_CHAT_API_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
REACT_APP_API_BASE_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev
```

**Your Lambda API Gateway Endpoint:**
```
https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
```

**Endpoint Details:**
- API Gateway ID: `qgpel27gok`
- Region: `ap-south-1` (Mumbai)
- Stage: `dev`
- Resource Path: `master`

2. **Important:** Restart the development server after creating/modifying `.env` file:
   ```bash
   npm start
   ```

#### For Production:

1. Set environment variables in your hosting platform (AWS, Vercel, Netlify, etc.)
2. Or create `.env.production` file:
   ```env
   REACT_APP_CHAT_API_URL=https://your-production-api.com/chat
   REACT_APP_API_BASE_URL=https://your-production-api.com
   ```

### 4. API Request Format

The application sends POST requests with the following structure:

**Request:**
```json
{
  "query": "User's query text here"
}
```

**Expected Response Format (Lambda Backend):**

The Lambda backend returns the following structure:

```json
{
  "query": "User's original query",
  "sql": "SELECT * FROM table WHERE ...",
  "data": [
    {"column1": "value1", "column2": "value2", ...},
    {"column1": "value3", "column2": "value4", ...}
  ],
  "response": "Natural language response from assistant",
  "visualization": {
    "chartType": "bar",
    "title": "Chart Title",
    "xAxis": "x-axis label",
    "yAxis": "y-axis label",
    "mode": null
  }
}
```

**Note:** The `data` field can be in multiple formats:
1. **List of dictionaries** (most common): `[{col1: val1, col2: val2}, ...]`
2. **Dictionary with 'rows' key**: `{rows: [...], columns: [...]}`
3. **Dictionary with 'data' key**: `{data: [...], columns: [...]}`
4. **Dictionary with 'results' key**: `{results: [...]}`

The frontend automatically handles all these formats and extracts column names from the data structure.

### 5. Additional API Endpoints

#### Excel Download Endpoint (Optional)

If your backend supports pre-generated Excel files:

**Location:** `src/components/chat/MessageActions.js` (lines 57-58)

```javascript
const apiBase = process.env.REACT_APP_API_BASE_URL || '';
const downloadUrl = `${apiBase}/download-excel/${message.excel_file_id}`;
```

**Request:**
- Method: `POST`
- URL: `{REACT_APP_API_BASE_URL}/download-excel/{excel_file_id}`
- Headers: `Content-Type: application/json`

**Response:**
- Binary Excel file (`.xlsx`)

### 6. Error Handling

The application includes error handling:

```javascript
try {
  const response = await fetch(CHAT_API_URL, {...});
  
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${errText}`);
  }
  
  const data = await response.json();
  // Process response...
} catch (error) {
  console.error('Error sending message:', error);
  // Show error message to user
}
```

### 7. Response Processing

The application processes responses in `App.js` (lines 106-188):

1. **Extracts data rows** from multiple possible paths:
   - `data.data.result.rows`
   - `data.data.rows`
   - `data.data` (if array)
   - `data.rows`

2. **Extracts column names** from multiple possible paths:
   - `data.data.result.columns`
   - `data.data.columns`
   - `data.data.columnNames`
   - `data.columns`

3. **Handles visualizations**:
   - Checks for `data.visualization` object
   - Extracts chart type and data

4. **Creates message object** with:
   - Response text
   - SQL query (if available)
   - Data rows and columns
   - Visualization config
   - Excel download flag

## Configuration Steps

### Step 1: Create Environment File

Create `.env` in the `CGMSCL` directory:

```bash
cd CGMSCL
touch .env
```

### Step 2: Add Your API URL

Edit `.env` and add your backend URL:

```env
REACT_APP_CHAT_API_URL=https://your-backend-url.com/api/chat
REACT_APP_API_BASE_URL=https://your-backend-url.com/api
```

### Step 3: Verify .gitignore

Ensure `.env` is in `.gitignore` to avoid committing secrets:

```gitignore
# .env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### Step 4: Restart Development Server

```bash
npm start
```

## Testing Backend Connection

### 1. Check Console Logs

The application logs API requests:
- `Sending request to AWS backend: {URL}`
- `API Response Data (Full): {...}`
- `API Response Data (Object): {...}`

### 2. Test with Sample Query

Send a test query and check:
- Network tab in browser DevTools
- Console for response data
- Error messages if connection fails

### 3. Verify Response Structure

Ensure your backend returns data in one of the supported formats (see section 4).

## Troubleshooting

### Issue: "API error 404"
- **Solution:** Check that `REACT_APP_CHAT_API_URL` is correct and the endpoint exists

### Issue: "API error 500"
- **Solution:** Check backend logs and ensure request format matches expected format

### Issue: Environment variable not working
- **Solution:** 
  1. Ensure variable name starts with `REACT_APP_`
  2. Restart development server
  3. Clear browser cache

### Issue: CORS errors
- **Solution:** Configure CORS on your backend to allow requests from your frontend domain

### Issue: Data not displaying
- **Solution:** Check console logs for response structure and ensure it matches one of the supported formats

## Backend Requirements Summary

Your Lambda backend should:

1. **Accept POST requests** at the configured endpoint
2. **Accept JSON body** with `{ "query": "..." }`
3. **Return JSON response** with:
   - `query`: Original user query
   - `sql`: Generated SQL query
   - `data`: SQL result (list of dicts or dict with rows/data)
   - `response`: Natural language response text
   - `visualization`: Chart configuration object (optional)
4. **Handle CORS** - Lambda function includes CORS headers:
   ```python
   'headers': {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Headers": "*",
       "Access-Control-Allow-Methods": "*",
   }
   ```
5. **Return appropriate HTTP status codes** (200 for success, 4xx/5xx for errors)

**Lambda Function Structure:**
- Uses AWS Bedrock (Claude 3.5 Sonnet) for LLM processing
- Classifies queries to determine which table to query
- Generates SQL queries based on table schemas
- Executes SQL via MCP (Model Context Protocol) server
- Generates natural language responses with visualization suggestions

## Example Backend Response (Lambda Format)

```json
{
  "query": "Show items expiring within 90 days",
  "sql": "SELECT ITEMNAME, EXPDATE, NEAREXPQTY FROM mv_batchwisecurrentstock WHERE DAYS_LEFT_TO_EXPIRE <= 90",
  "data": [
    {
      "ITEMNAME": "Paracetamol 500mg Tablet",
      "EXPDATE": "2025-03-15",
      "NEAREXPQTY": 100
    },
    {
      "ITEMNAME": "Amoxicillin 250mg Capsule",
      "EXPDATE": "2025-04-20",
      "NEAREXPQTY": 50
    }
  ],
  "response": "## Near Expiry Items Analysis\n\n### Items Expiring Within 90 Days\n\n| **Item Name** | **Expiry Date** | **Quantity** |\n|:-------------|:---------------|:-------------|\n| Paracetamol 500mg Tablet | 15-03-2025 | 100 |\n| Amoxicillin 250mg Capsule | 20-04-2025 | 50 |",
  "visualization": {
    "chartType": "bar",
    "title": "Items Expiring Within 90 Days",
    "xAxis": "Item Name",
    "yAxis": "Quantity",
    "mode": null
  }
}
```

## Next Steps

1. Set up your backend API endpoint
2. Configure environment variables
3. Test the connection
4. Verify response format matches expected structure
5. Handle any CORS or authentication requirements
