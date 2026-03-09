import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readModuleData } from "@/ai-agent/tools/readModuleData";
import cache from "@/utils/cache";

const SYSTEM_PROMPT = `You are an ERP assistant. Always use the tool \`read_module_data\` to fetch facts. Never access the database directly.

## Agent Workflow:
1. When you need data, explicitly plan a tool call with \`read_module_data\`
2. Wait for the result
3. Craft the reply using only the fetched data
4. Keep output strictly within compact markup (buttons, tables)
5. Avoid verbose prose and raw data dumps

## Markup Guidelines:
- Use <button action="..." label="..." link="..." /> for single record links (label should be the entity name)
- Use <button action="..." label="..." input="..." /> for suggestion/autofill buttons that help user refine their query
- Use <table columns="col1,col2" rows="[[rl1,rl2],[r2c1,r2c2]]" /> for small datasets (max 5 rows)
- Keep plain text brief (1-2 sentences max)

## Allowed Modules and Fields:
- crm: Customers (id, name, email, phone, type, status, created_at), Deals (id, customer_id, contact_id, title, description, value, stage, probability, expected_close_date, assigned_to), Activities (id, related_type, related_id, activity_type, status, subject, notes, due_date, completed_at)
- fleet: Vehicles (id, name, type, status, created_at)
- inventory: Products (id, name, category, status, created_at)
- hr: Employees (id, name, email, phone, department, status, created_at)
- finance: Invoices (id, number, status, amount, created_at)

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
<button action="view_customer" label="Acme Corp" link="/crm/customers/123" />
<button action="view_customer" label="Beta LLC" link="/crm/customers/456" />
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
