# Lambda Backend Connection Setup Guide

## Quick Start

### Step 1: Get Your Lambda API Gateway URL

Your Lambda function is deployed behind AWS API Gateway. You need the API Gateway endpoint URL.

**Your Actual Endpoint:**
```
https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
```

**Format:**
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/{resource-path}
```

**Your Endpoint Details:**
- API ID: `qgpel27gok`
- Region: `ap-south-1`
- Stage: `dev`
- Resource: `master`

### Step 2: Create Environment File

Create a `.env` file in the `CGMSCL` directory:

```bash
cd CGMSCL
touch .env
```

### Step 3: Add Your Lambda URL

The `.env` file has been created with the actual endpoint:

```env
REACT_APP_CHAT_API_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
REACT_APP_API_BASE_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev
```

**Your Lambda Endpoint:**
- **API Gateway URL**: `https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master`
- **Region**: `ap-south-1`
- **Stage**: `dev`
- **Resource**: `master`

### Step 4: Restart Development Server

```bash
npm start
```

## Lambda Backend Details

### Request Format

The frontend sends:
```json
{
  "query": "User's question here"
}
```

### Response Format

The Lambda returns:
```json
{
  "query": "Original query",
  "sql": "SELECT ...",
  "data": [
    {"column1": "value1", "column2": "value2"},
    {"column1": "value3", "column2": "value4"}
  ],
  "response": "Natural language response",
  "visualization": {
    "chartType": "bar",
    "title": "Chart Title",
    "xAxis": "x-axis",
    "yAxis": "y-axis",
    "mode": null
  }
}
```

### Lambda Function Features

1. **Table Classification**: Automatically determines which database table to query
2. **SQL Generation**: Generates SQL queries using Claude 3.5 Sonnet
3. **SQL Execution**: Executes queries via MCP (Model Context Protocol) server
4. **Response Generation**: Creates natural language responses with markdown formatting
5. **Visualization Suggestions**: Recommends chart types based on data

### Supported Tables

The Lambda function supports these database tables:
- `PO_DATA` - Purchase Order data
- `TENDER_DATA` - Tender information
- `EXPIRED_ITEMS` - Expired inventory items
- `MV_QC_TRANSACTIONS` - Quality Control transactions
- `MV_ACCEPTED_RC_PENDING` - Accepted items pending RC approval
- `MV_BATCHWISECURRENTSTOCK` - Batch-wise current stock
- `MV_PAYMENT_STATUS` - Payment status information
- `MV_PIPELINE_SUPPLIES` - Pipeline supplies tracking
- `MASVENDORREGISTRATION` - Vendor registration
- `MV_PO_PLANNING26_27` - PO planning data

## Testing the Connection

1. **Check Console Logs**: Open browser DevTools and check the Console tab
2. **Send Test Query**: Try a simple query like "Show me items expiring soon"
3. **Verify Response**: Check that you receive:
   - Response text
   - SQL query
   - Data rows
   - Visualization config (if applicable)

## Troubleshooting

### Issue: CORS Error
- **Solution**: Lambda function already includes CORS headers. If you still see CORS errors, check API Gateway CORS settings.

### Issue: 404 Not Found
- **Solution**: Verify your API Gateway URL is correct and the Lambda function is deployed.

### Issue: 500 Internal Server Error
- **Solution**: Check CloudWatch logs for the Lambda function to see the error details.

### Issue: Data Not Displaying
- **Solution**: Check browser console for response structure. The frontend automatically handles multiple data formats.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_CHAT_API_URL` | Yes | Full URL to Lambda API Gateway endpoint |
| `REACT_APP_API_BASE_URL` | No | Base URL for additional API endpoints (Excel downloads, etc.) |

## Next Steps

1. ✅ Set up `.env` file with your Lambda URL
2. ✅ Restart development server
3. ✅ Test with a sample query
4. ✅ Verify data is displaying correctly
5. ✅ Test Excel download functionality (if applicable)

## Support

For issues with:
- **Frontend**: Check `BACKEND_CONNECTION.md` for detailed troubleshooting
- **Lambda Backend**: Check CloudWatch logs and Lambda function configuration
- **API Gateway**: Verify CORS settings and endpoint configuration
