# API Endpoint Information

## Current Configuration

### Lambda API Gateway Endpoint

**Full URL:**
```
https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
```

**Base URL:**
```
https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev
```

### Environment Variables

The `.env` file contains:
```env
REACT_APP_CHAT_API_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master
REACT_APP_API_BASE_URL=https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev
```

### Testing the Endpoint

**Using cURL (PowerShell):**
```powershell
curl.exe -X POST "https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master" `
  -H "Content-Type: application/json" `
  -d '{\"query\": \"NAME ME EVERY TABLE WE HAVE\"}'
```

**Using cURL (Bash/Linux):**
```bash
curl -X POST "https://qgpel27gok.execute-api.ap-south-1.amazonaws.com/dev/master" \
  -H "Content-Type: application/json" \
  -d '{"query": "NAME ME EVERY TABLE WE HAVE"}'
```

**Request Format:**
```json
{
  "query": "Your question here"
}
```

**Response Format:**
```json
{
  "query": "Original query",
  "sql": "SELECT ...",
  "data": [...],
  "response": "Natural language response",
  "visualization": {...}
}
```

### Next Steps

1. ✅ `.env` file created with endpoint
2. ⏭️ Restart development server: `npm start`
3. ⏭️ Test with a sample query in the app
4. ⏭️ Verify response is displayed correctly

### Troubleshooting

If you encounter issues:
1. Verify the endpoint is accessible (test with cURL)
2. Check browser console for errors
3. Verify CORS is enabled (Lambda function includes CORS headers)
4. Check CloudWatch logs for Lambda function errors
