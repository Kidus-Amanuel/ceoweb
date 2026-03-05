# Secure, Token-Frugal ERP AI Agent — Single File Master Guide
**Stack:** :contentReference[oaicite:3]{index=3} `gemini-2.5-flash` family + :contentReference[oaicite:4]{index=4} AI SDK v6 + Supabase (RLS + Edge Functions)

> Sources: Google/Vertex Gemini model docs and Vercel AI SDK v6 release/docs; Google Cloud free trial info. :contentReference[oaicite:5]{index=5}

---

## Goal (one-sentence)
Build a minimal-token, secure ERP agent that *only* uses versatile Supabase Edge Functions to read CRM / Fleet / Inventory — one table per call — with RLS/policies enforcing permissions and the AI returning compact markup (cards, buttons, links).

---

## Quick decisions (latest-choices)
- Model: `gemini-2.5-flash` (Flash family — best price/perf for production-grade short responses). :contentReference[oaicite:6]{index=6}  
- SDK: Vercel AI SDK **v6** (provider-specific tools & agent support). :contentReference[oaicite:7]{index=7}  
- Free credits: Use Google Cloud free $300 trial + always-free quotas to prototype Vertex AI calls. :contentReference[oaicite:8]{index=8}

---

## Single-file contents (what this .md contains)
1. Minimal security policy snippets (RLS + role checks)  
2. One versatile Edge Function `readModuleData` (accepts `module`, `filters`) — reads **one** table only  
3. Tool wrapper (Vercel AI SDK v6 compatible)  
4. Master system prompt (enforce minimum tokens + markup output)  
5. Example Next.js/Vercel route using `gemini-2.5-flash` and limiting recursion & tokens  
6. Markup templates & best practices for compact UI-like responses

---

## 1) Security (Supabase) – already handled
The Supabase schema migrations have already enabled row-level security and defined the necessary role policies. No further action is required here; the agent will respect these rules automatically.

---

## 2) Build the Edge Function `readModuleData`
This is the first concrete artifact. Approach it exactly as you see me working:

1. **Create function scaffolding** under `supabase/functions/readModuleData/index.ts`.
   - Use the existing project setup or initialize with `supabase functions new`.
   - Export a default handler that receives `Request` and `SupabaseClient` via context.

2. **Validate input** at the top of the handler:
   - Parse JSON body, ensure `module` is `crm|fleet|inventory`.
   - Coerce or reject `filters` object.

3. **Perform the query**:
   - Map `module` to its table name.
   - Call `const { data, error } = await context.supabase.from(table).select(...).match(filters);
`.
   - Extract only the columns required by the UI – keep payload minimal.

4. **Return results**:
   - If error, respond with `json({error: error.message}, { status: 400 })`.
   - Otherwise `json({ data })`.

5. **Security**:
   - No additional role-check code; RLS handles filtering based on JWT.
   - Ensure the function runs with context user (default behavior).

6. **Test manually** using `supabase functions serve` and `curl` calls to each module with simple filters.

This single function becomes the exclusive data retrieval tool for the agent.

## 3) Tool wrapper (Vercel AI SDK v6 compatible)
This helper mirrors how I query the repo or run a function when preparing a response.

1. **Create file** `ai-agent/tools/readModuleData.ts` (or similar).
2. **Export an async function** that accepts `(module: string, filters?: Record<string, any>)`.
   - Build a POST request to your Edge Function endpoint (`/api/edge/readModuleData` or supabase URL).
   - Include the user's JWT in headers so RLS can apply.
3. **Handle response**:
   - If status >= 400 throw an error with message.
   - Parse JSON and return the `data` field.
   - Always log minimally for debugging (avoid printing entire payload). 
4. **Register for Vercel AI**: when creating the AI client, include
   ```js
   tools: [{
     name: 'read_module_data',
     description: 'Fetch rows from crm, fleet, or inventory.',
     func: readModuleDataTool, // the wrapper
   }]
   ```
   The SDK will call your function when the agent invokes by name.

Think of this wrapper as the bridge between the agent's reasoning and actual database access; keep it as thin and deterministic as possible.

## 4) Master system prompt
Write the system prompt as if you were coaching a junior agent assistant (just like I coach myself when thinking). It must include:

- Instruction to **never** access the database directly; the only allowed operation is calling `read_module_data` with a module name and optional filters.
- A note on **agent workflow**: when the AI needs data it should explicitly plan a tool call, wait for the result, then craft the reply using that data. This mimics my step-by-step reasoning.
- Rules for **token frugality**: keep output strictly within markup, avoid verbose prose, and never echo raw data dumps.
- Markup examples for each module (crm, fleet, inventory), e.g.: 
  ```
  <card title="Customer: Acme" subtitle="Status: Active" link="/crm/customers/123" />
  <button action="view_inventory" label="View stock" />
  ```
- A reminder that the AI should **return JSON-like markup** only; any plain text must be brief an introductory sentence.

Keep the prompt concise but comprehensive—it will be the immutable directive used by the agent route.

## 5) Example Next.js/Vercel route
This route is where the agent behaves exactly like me answering a question using tools.

1. **Create** `app/api/ai/agent/route.ts` (or `.js`).
2. **Parse POST body** to get `userMessage` and any `conversationId`/history.
3. **Trim history** to the last few exchanges to stay within token budget.
4. **Instantiate** the `VercelAI` client:
   ```ts
   const ai = new VercelAI({ apiKey: process.env.VERCEL_AI_KEY, model: 'gemini-2.5-flash' });
   ```
5. **Define tools** array including the `read_module_data` wrapper.
6. **Compose messages**: first a system message containing the master prompt, then user + assistant history, then the new userMessage.
7. **Call** `ai.chat.completions.create({ messages, tools, max_output_tokens: 400 });`.
8. **Return** the AI's response JSON to the caller.

Implement safeguards just like I do during reasoning:
- Limit to 1 tool call per user query by tracking a flag.
- Enforce a hard cap on tokens (e.g. 1024) and truncate overly long history.
- Rate limit requests per user/session.

This route acts like the execution environment where the AI follows the master prompt and uses tools, exactly like the way I’m performing tasks in this conversation.

## 6) Markup templates & best practices
To mirror how I create concise UI snippets, define and document the exact markup tags the agent may output. Keep them extremely simple:

- `<card title="..." subtitle="..." link="..." />` — use for any single record summary.
- `<button action="..." label="..." />` — for user actions or navigation links.
- `<table columns="col1,col2" rows="[[rl1,rl2],[r2c1,r2c2]]" />` — only for small tabular datasets (max 5 rows).

Put these definitions in the system prompt as examples, and instruct the AI that any deviation will be considered a mistake. The goal is to have a predictable, token-frugal output format that your frontend can render without parsing arbitrary text.

---

The above changes ensure the instructions are explicit, actionable, and mimic the stepwise approach I use when performing tasks. You're now ready to implement the Edge Function or ask me to do so next.
---

With this expanded guide in place, we can now implement each component sequentially. Start by writing the Edge Function, then the tool wrapper, followed by the prompt and route, finishing with markup helpers. I'll await your next instruction.