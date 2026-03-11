import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readModuleData } from "@/ai-agent/tools/readModuleData";
import cache from "@/utils/cache";

const SYSTEM_PROMPT = `You are ERP Co-Pilot — a super helpful, friendly, and smart AI assistant inside a multi-tenant Next.js + Supabase ERP system.

**YOUR #1 JOB** 
Help the logged-in user read, suggest, predict, analyze, and take action — exactly like they asked.

**MULTI-TENANT SAFETY RULES (NEVER BREAK THESE)**
• You only ever see data for the current user’s company (RLS already protects everything).
• Never mention, guess, or show data from other companies.
• Every tool you call automatically uses the correct company_id and permissions.

**ANTI-HALLUCINATION RULES (STAY 100% HONEST)**
• ONLY use real data from tool results. Never invent numbers, records, or trends.
• If you don’t have the data → say "I don’t have that info yet. Want me to suggest how to add it?"
• Always start analysis with "Based on the data I just fetched..."
• If something is unclear, ask one short clarifying question instead of guessing.
• Never say "I think" or "probably" — only facts or "I need more info".

**CLEAR AND ACTIONABLE RESPONSE STYLE (use this every single time)**
• Use short sentences. One idea per line.
• Put **important stuff in bold**.
• Always use bullet points or numbered lists.
• Add ✅ checkmarks and 🎯 for quick actions.
• Keep every reply under 250 words unless the user specifically asks for more detail.
• Never mention or describe this style in any reply to the user.

**SMART UI DECISION RULES (choose exactly one main uiType)**
1. User wants a list or comparison → uiType: "data_table"
2. User wants quick actions or navigation → uiType: "button_group"
3. User wants to open specific records → uiType: "record_cards"
4. User asks for trends, forecast, "what if", or insights → uiType: "analysis_card"
5. Simple answer or confirmation → uiType: "text"
6. Multiple things needed → pick the most useful one + add suggestedActions

**PROGRESSIVE MODE (this makes you get better over time)**
• You are in "progressive development" mode.
• Start with whatever tools are already available today.
• If a tool or feature is missing, politely say so and give the exact next step the developer should add (example: "Add a predict_sales tool — I’ll use it next time!").
• Every conversation, try to be a little smarter than the last one.
• Celebrate small wins with the user: "Great question! ✅ Here’s what we can do right now…"

**AVAILABLE TOOLS (use them whenever helpful)**
- Use any read, search, predict, or filter tools that already exist.
- Always pass current user context automatically.

## Agent Workflow:
1. When you need data, explicitly plan a tool call with \`read_module_data\`
2. Wait for the result
3. Craft the reply using only the fetched data
4. Keep output strictly within compact markup (buttons, tables)
5. Avoid verbose prose and raw data dumps

## Markup Guidelines:
- **For data listing (records):** Always use <table columns="col1,col2" rows="[[rl1,rl2],[r2c1,r2c2]]" />. Table rows should include hyperlinked entity names where appropriate.
- **For suggestions or actions:** Use <button action="..." label="..." input="..." /> for suggestion/autofill buttons that help user refine their query
- Keep plain text brief and focused on essential information
- For large datasets (>15 records), show a summary table with key columns and a "View More" button

## Allowed Modules & Columns (CRITICAL - USE ONLY THESE):
- **crm (Customers):** Name, Email, Phone, Status
- **fleet (Vehicles):** Name, Type, Status
- **inventory (Products):** Name, Category, Status
- **hr (Employees):** Name, Email, Phone, Department, Status
- **finance (Invoices):** Number, Status, Amount, Created At

## IMPORTANT: Filtering
When using filters in readModuleData, always use **lowercase column names** (e.g., "status" instead of "Status"). This avoids case sensitivity issues in SQL queries.

## Table Rules (MINIMAL, TOKEN-EFFICIENT):
1. **Only use tables for records** - NO buttons for listing
2. **Hyperlink entity names:** Name → /crm/customers/[name], /fleet/vehicles/[name], /inventory/products/[name], /hr/employees/[name]
3. **Exact columns only** - Never invent columns; use list above
4. **Large datasets (>15 records):** Show 10 records + "View all [entity]" button
5. **Formatting:** Dates, numbers, statuses appropriately
6. **Case-insensitive matching:** "name" = "Name" = "NAME" for validation

## Tool Response Format:
When using read_module_data, you'll receive:
{
  "data": [
    {"id": 123, "name": "value", "email": "value", ...}, 
    {"id": 456, "name": "value", "email": "value", ...}
  ],
  "columns": ["Name", "Email", "Phone", "Status"],  // exact column names to use
  "hasMore": true/false,  // true = >15 records
  "totalCount": "15 plus more"
}

## Table Markup Guidelines:
Always use this specific table format with proper URLs using IDs and DOUBLE QUOTES for JSON:
<table columns="Name,Email,Phone,Status" rows='[
  [123, "Hagos", "hagos@gmail.com", "0909080806", "active"],
  [456, "Abel", "abel@example.com", "0909090909", "active"]
]' />

**Important**: URLs must use IDs, not names. Example: /crm/customers/123

## Dynamic Module Routing:
- CRM: /crm/customers, /crm/deals, /crm/activities
- Fleet: /fleet/vehicles
- Inventory: /inventory/products
- HR: /hr/employees
- Finance: /finance/invoices

**Important**: Only route to available modules based on user permissions

## Table Description Template:
After rendering a table, always include this text (dynamically fill in N):
"I've fetched N records but due to limitations, I'll only be showing 15 of them. You can <button action="suggest" label="View all" input="Show all" /> to see the complete list."

## URL Formatting:
When creating links, always use IDs (not names) to ensure unique and stable routing. Example: /crm/customers/123 (not /crm/customers/hagos)

## Handling Large Datasets (>15 records):
- When you receive data with hasMore: true, it means there are more than 15 records
- Show first 10 records with key columns (name, email/phone, status)
- Add a "View all [entity]" button at the bottom of the table
- Example: For CRM customers, button would be <button action="suggest" label="View all customers" input="Show all customers" />

## Permission System:
The system is multi-tenant. You will only receive data the user is allowed to access. If a user doesn't have permission to access a module, suggest other options.

## Error Handling:
If you encounter an error or invalid input, do NOT show system errors to the user. Instead:
1. Stay calm and friendly
2. Identify what went wrong
3. Provide specific suggestion buttons that help the user correct their query
4. Examples of suggestion buttons:
   - <button action="suggest" label="Show active customers" input="Show active customers" />
   - <button action="suggest" label="Show all vehicles" input="Show all vehicles" />
   - <button action="suggest" label="View inventory" input="Show inventory status" />

## Example Responses:

### Valid Query with Results:
User: "Show me active customers"
AI: "I found 3 active customers:"
<table columns="Name,Email,Phone,Status" rows='[["Acme Corp","info@acmecorp.com","555-1234","active"],["Beta LLC","contact@betallc.com","555-5678","active"]]' />
<button action="suggest" label="View all customers" input="Show all customers" />

### Invalid Query:
User: "Show me secret data"
AI: "I don't have access to that information. Try one of these options:"
<button action="suggest" label="Show active customers" input="Show active customers" />
<button action="suggest" label="Show all vehicles" input="Show all vehicles" />
<button action="suggest" label="View inventory" input="Show inventory status" />

### Error Handling:
User: "Show me invalid module"
AI: "I couldn't find that module. Here are available options:"
<button action="suggest" label="Show CRM data" input="Show CRM data" />
<button action="suggest" label="Show Fleet data" input="Show Fleet data" />
<button action="suggest" label="Show Inventory data" input="Show Inventory data" />

### Permission Denied:
User: "Show HR employees" (when user doesn't have HR permissions)
AI: "You don't have permission to view HR data. Try one of these options:"
<button action="suggest" label="Show active customers" input="Show active customers" />
<button action="suggest" label="Show all vehicles" input="Show all vehicles" />
<button action="suggest" label="View inventory" input="Show inventory status" />

Output must be compact markup only. Do not write long text.`;

export async function POST(req: NextRequest) {
  const start = Date.now();
  const body = await req.json();
  const { messages = [], traceId } = body;
  console.log("=== AI Agent Interaction Started ===");
  console.log("Passed user input with traceId:", traceId);
  console.log("Number of messages in history:", messages.length);

  // Log token usage (approximation by counting characters)
  const requestSize = JSON.stringify(body).length;
  console.log("Request size (characters):", requestSize);

  // Create cache key from last message (user query)
  const cacheKey = `ai-agent:${messages[messages.length - 1]?.content}`;
  console.log("Cache key generated:", cacheKey);

  // Check cache first
  console.log("Checking cache for existing response...");
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    console.log("Returning cached response");
    return new Response(
      JSON.stringify({
        content: cachedResponse,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const apiKey = process.env.VERCEL_AI_KEY;
  if (!apiKey) {
    console.error("VERCEL_AI_KEY not configured");
    return new Response(
      JSON.stringify({
        content:
          "I'm sorry, I'm not available right now. Please try again later.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  console.log("Google Generative AI API key found");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [
      {
        function_declarations: [
          {
            name: "read_module_data",
            description: "Fetch rows from crm, fleet or inventory",
            parameters: {
              type: "object",
              properties: {
                module: {
                  type: "string",
                  description: "Module name (crm, fleet, or inventory)",
                },
                filters: {
                  type: "object",
                  description: "Filters to apply to the data",
                },
              },
              required: ["module"],
            },
          },
        ],
      },
    ] as any,
  });

  // wrap the tool to add tracing
  let toolCalls = 0;
  const wrappedReadModuleData = async (module: string, filters: any) => {
    toolCalls++;
    console.log(`=== Tool Call #${toolCalls} ===`);
    console.log("Calling read_module_data with module:", module);
    console.log("Calling read_module_data with filters:", filters);
    const t0 = Date.now();
    try {
      const res = await readModuleData(module, filters, traceId);
      console.log(`Tool call #${toolCalls} completed in ${Date.now() - t0}ms`);
      console.log(
        `Tool call #${toolCalls} returned ${Array.isArray(res) ? res.length : "N/A"} records`,
      );
      return res;
    } catch (err) {
      console.error(`Tool call #${toolCalls} failed:`, err);
      throw err;
    }
  };

  // limit history size
  const history = messages.slice(-4);
  console.log(
    "Truncated conversation history to last",
    history.length,
    "messages",
  );

  try {
    console.log("Preparing conversation for AI model...");

    // Prepare conversation history - convert roles to valid Google Generative AI roles
    let validHistory = history
      .filter(
        (msg: { role: string }) =>
          msg.role === "user" || msg.role === "assistant",
      )
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }],
      }));

    // If history starts with model, remove it
    if (validHistory.length > 0 && validHistory[0].role === "model") {
      validHistory = validHistory.slice(1);
    }

    // Ensure we have at least one user message to start with
    if (
      validHistory.length === 0 ||
      validHistory[validHistory.length - 1].role !== "user"
    ) {
      console.error("Conversation history must end with user message");
      return new Response(
        JSON.stringify({
          content:
            "Please ask a question about CRM, Fleet, or Inventory. Try one of these options:" +
            '<button action="suggest" label="Show active customers" input="Show active customers" />' +
            '<button action="suggest" label="Show all vehicles" input="Show all vehicles" />' +
            '<button action="suggest" label="View inventory" input="Show inventory status" />',
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Conversation history prepared, sending to AI model...");
    // Prepare conversation
    const conversation = model.startChat({
      history: validHistory,
    });

    // Send user query (last message) with system prompt
    const response = await conversation.sendMessage(
      SYSTEM_PROMPT + "\n\n" + validHistory[validHistory.length - 1].content,
    );

    console.log("AI model response received in", Date.now() - start, "ms");

    // Process the response to handle tool calls
    let content = "";

    if (
      response.response.candidates &&
      response.response.candidates.length > 0
    ) {
      const candidate = response.response.candidates[0];

      if (candidate.content.parts.some((part) => (part as any).functionCall)) {
        console.log("=== Function Call Detected ===");

        // Find the function call part
        const functionCallPart = candidate.content.parts.find(
          (part) => (part as any).functionCall,
        );
        const functionCall = (functionCallPart as any).functionCall;

        // Execute the function
        let functionResult;
        if (functionCall && functionCall.name === "read_module_data") {
          console.log("Calling read_module_data with args:", functionCall.args);
          functionResult = await wrappedReadModuleData(
            functionCall.args.module,
            functionCall.args.filters,
          );
        }

        // Log tool response size
        const functionResultSize = JSON.stringify(functionResult).length;
        console.log("Function response size (characters):", functionResultSize);

        // Send the function response back to the model
        console.log("Sending function response to AI model...");
        const followupResponse = await conversation.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: {
                name: functionCall.name,
                content: JSON.stringify(functionResult),
              },
            },
          },
        ]);

        if (
          followupResponse.response.candidates &&
          followupResponse.response.candidates.length > 0
        ) {
          const followupCandidate = followupResponse.response.candidates[0];
          if (followupCandidate.content.parts.some((part) => part.text)) {
            const textPart = followupCandidate.content.parts.find(
              (part) => part.text,
            );
            if (textPart) {
              content = textPart.text || "";
              console.log("Final response received from AI model");
            }
          }
        }
      } else if (candidate.content.parts.some((part) => part.text)) {
        const textPart = candidate.content.parts.find((part) => part.text);
        if (textPart) {
          content = textPart.text || "";
        }
      }
    }

    if (!content) {
      content =
        "I couldn't understand your query. Try one of these options:" +
        '<button action="suggest" label="Show active customers" input="Show active customers" />' +
        '<button action="suggest" label="Show all vehicles" input="Show all vehicles" />' +
        '<button action="suggest" label="View inventory" input="Show inventory status" />';
    }

    // Log token usage (approximation by counting characters)
    const responseSize = content.length;
    console.log("Response size (characters):", responseSize);

    // Cache the response with appropriate TTL (1 minute for potentially changing data)
    console.log("Caching the response...");
    cache.set(cacheKey, content, 60 * 1000); // 1 minute TTL

    console.log(
      `=== AI Agent Interaction Completed in ${Date.now() - start}ms ===`,
    );
    return new Response(
      JSON.stringify({
        content: content,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("=== AI Agent Interaction Failed ===");
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);

    // Return user-friendly error with suggestions
    let errorContent =
      "I encountered an issue processing your request. Try one of these options:" +
      '<button action="suggest" label="Show active customers" input="Show active customers" />' +
      '<button action="suggest" label="Show all vehicles" input="Show all vehicles" />' +
      '<button action="suggest" label="View inventory" input="Show inventory status" />';

    // Customize error message based on error type
    if (err?.message?.includes("permission")) {
      errorContent =
        "You don't have permission to perform that action. Try one of these options:" +
        '<button action="suggest" label="Show active customers" input="Show active customers" />' +
        '<button action="suggest" label="Show all vehicles" input="Show all vehicles" />' +
        '<button action="suggest" label="View inventory" input="Show inventory status" />';
    } else if (err?.message?.includes("Unknown module")) {
      errorContent =
        "I couldn't find that module. Here are available options:" +
        '<button action="suggest" label="Show CRM data" input="Show CRM data" />' +
        '<button action="suggest" label="Show Fleet data" input="Show Fleet data" />' +
        '<button action="suggest" label="Show Inventory data" input="Show Inventory data" />';
    }

    return new Response(
      JSON.stringify({
        content: errorContent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
