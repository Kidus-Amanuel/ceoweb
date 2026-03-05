const http = require('http');

const data = JSON.stringify({
  messages: [
    { 
      role: "user", 
      content: "Show me all active customers in CRM" 
    }
  ],
  traceId: "test-trace-123"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/agent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});

req.write(data);
req.end();
