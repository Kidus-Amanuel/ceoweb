const http = require("http");

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function testAIAgent() {
  try {
    // First, let's login to get a session
    console.log("=== Logging in to get session ===");

    const loginBody = JSON.stringify({
      email: "natiemls72@gmail.com",
      password: "1234!@#$qwerQWER",
    });

    const loginOptions = {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": loginBody.length,
      },
    };

    const loginResult = await makeRequest(loginOptions, loginBody);
    console.log(`Login Status Code: ${loginResult.statusCode}`);

    if (loginResult.statusCode !== 200) {
      console.error(`Login failed with status: ${loginResult.statusCode}`);
      console.error(`Response Body: ${loginResult.body}`);
      return;
    }

    // Extract cookies from the login response
    const cookies = loginResult.headers["set-cookie"] || [];
    console.log("Cookies:", cookies);

    // Now test the AI agent with the session
    console.log("\n=== Testing AI Agent ===");

    const aiAgentBody = JSON.stringify({
      messages: [
        {
          role: "user",
          content:
            "Show me customers with their associated deals and activities. Use includeRelated: true to fetch related data.",
        },
      ],
      traceId: "test-trace-" + Date.now(),
    });

    const aiAgentOptions = {
      hostname: "localhost",
      port: 3000,
      path: "/api/ai/agent",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": aiAgentBody.length,
        Cookie: cookies.join("; "),
      },
    };

    const aiAgentResult = await makeRequest(aiAgentOptions, aiAgentBody);
    console.log(`AI Agent Status Code: ${aiAgentResult.statusCode}`);
    console.log(`AI Agent Response: ${aiAgentResult.body}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the test
testAIAgent();
