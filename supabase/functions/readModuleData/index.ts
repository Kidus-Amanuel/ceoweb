import { serve } from "https://deno.land/x/sift@0.5.0/mod.ts";
import { z } from "zod";

// input schema
const bodySchema = z.object({
  module: z.enum(["crm", "fleet", "inventory"]),
  filters: z.record(z.any()).optional(),
});

serve(async (req: Request, ctx) => {
  try {
    const json = await req.json();
    const traceHeader = req.headers.get("x-trace-id") || json.traceId || json.traceID || json.trace;
    console.log("[readModuleData] incoming body:", JSON.stringify(json));
    if (traceHeader) console.log("[readModuleData] traceId:", traceHeader);
    const data = bodySchema.parse(json);

    // map module name to table name
    const table = {
      crm: "customers",
      fleet: "vehicles",
      inventory: "products",
    }[data.module];
    console.log(`[readModuleData] module=${data.module} table=${table} filters=${JSON.stringify(
      data.filters || {},
    )} trace=${traceHeader}`);

    // only select minimal fields to keep response small
    const selectCols = "*"; // or a comma list depending on module

    const { data: rows, error } = await ctx.supabase
      .from(table)
      .select(selectCols)
      .match(data.filters || {});

    if (error) {
      console.error("[readModuleData] supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    console.log(
      `[readModuleData] returning ${Array.isArray(rows) ? rows.length : 0} rows`,
    );

    return new Response(JSON.stringify({ data: rows ?? [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("readModuleData error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
});
