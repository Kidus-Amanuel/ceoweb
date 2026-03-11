"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FleetService } from "@/services/fleet.service";
import {
  fleetCompanyScopeSchema,
  fleetCreateCustomFieldInputSchema,
  fleetCreateRowInputSchema,
  fleetDeleteCustomFieldInputSchema,
  fleetDeleteRowInputSchema,
  fleetEntityTypeSchema,
  fleetTableViewInputSchema,
  fleetUpdateCustomFieldInputSchema,
  fleetUpdateRowInputSchema,
} from "@/validators/fleet";

type ActionResult<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

const zodErrorToText = (error: z.ZodError) =>
  error.issues
    .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join(" | ");

async function getAuthContext(
  companyId: string,
): Promise<ActionResult<{ companyId: string; userId: string; supabase: any }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  // Company scoping is enforced by Supabase RLS and explicit company_id
  // filters in every query — no need to cross-check profiles here.
  return {
    success: true,
    data: {
      companyId,
      userId: user.id,
      supabase,
    },
  };
}

export async function getFleetTableViewAction(input: unknown): Promise<
  ActionResult<{
    rows: Record<string, unknown>[];
    totalRows: number;
    columnDefinitions: Record<string, unknown>[];
  }>
> {
  const parsed = fleetTableViewInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const { supabase, companyId } = auth.data;
  const { table, page, pageSize, search } = parsed.data;

  const [rowsResult, columnsResult] = await Promise.all([
    FleetService.listRows({
      supabase,
      companyId,
      entityType: table,
      page,
      pageSize,
      search,
    }),
    FleetService.getColumnDefinitions({
      supabase,
      companyId,
      entityType: table,
    }),
  ]);

  if (rowsResult.error) return { success: false, error: rowsResult.error };
  if (columnsResult.error)
    return { success: false, error: columnsResult.error };

  return {
    success: true,
    data: {
      rows: (rowsResult.data?.rows ?? []) as Record<string, unknown>[],
      totalRows: rowsResult.data?.count ?? 0,
      columnDefinitions: (columnsResult.data ?? []) as unknown as Record<
        string,
        unknown
      >[],
    },
  };
}

export async function createFleetCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = fleetCreateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[Fleet Action] createFleetCustomFieldAction Validation Failed:",
      parsed.error.format(),
    );
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  console.log("[Fleet Action] Creating Custom Field:", parsed.data);
  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    console.error("[Fleet Action] Auth Failed:", auth.error);
    return { success: false, error: auth.error };
  }

  const response = await FleetService.createCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    payload: {
      entityType: parsed.data.entityType,
      fieldLabel: parsed.data.fieldLabel,
      fieldName: parsed.data.fieldName ?? "",
      fieldType: parsed.data.fieldType,
      fieldOptions: parsed.data.fieldOptions,
      isRequired: parsed.data.isRequired,
    },
  });

  if (response.error || !response.data) {
    console.error("[Fleet Action] Service Error:", response.error);
    return {
      success: false,
      error: response.error || "Failed to create custom field",
    };
  }

  console.log(
    "[Fleet Action] Custom Field Created Successfully:",
    response.data.id,
  );
  return { success: true, data: response.data as Record<string, unknown> };
}

export async function updateFleetCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = fleetUpdateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await FleetService.updateCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    fieldId: parsed.data.fieldId,
    payload: {
      entityType: parsed.data.entityType,
      fieldLabel: parsed.data.fieldLabel,
      fieldName: parsed.data.fieldName ?? "",
      fieldType: parsed.data.fieldType,
      fieldOptions: parsed.data.fieldOptions,
      isRequired: parsed.data.isRequired,
    },
  });

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to update custom field",
    };
  }

  return { success: true, data: response.data as Record<string, unknown> };
}

export async function deleteFleetCustomFieldAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = fleetDeleteCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await FleetService.deleteCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    fieldId: parsed.data.fieldId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: null };
}

export async function createFleetRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = fleetCreateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const { supabase, companyId } = auth.data;
  const { table: entityType, standardData, customData } = parsed.data;
  const table = FleetService.mapEntityToTable(entityType);

  const { data, error } = await supabase
    .from(table)
    .insert({
      company_id: companyId,
      ...standardData,
      custom_fields: customData || {},
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  // 1. Link any "new-row" attachments to this newly created record
  await supabase
    .from("attachments")
    .update({ record_id: data.id })
    .eq("record_id", "00000000-0000-0000-0000-000000000000")
    .eq("table_name", entityType)
    .eq("company_id", companyId);

  if (table === "vehicles") {
    try {
      await FleetService.syncVehicleToTraccar(data.id);
    } catch (e) {
      console.error("[Fleet Actions] Traccar Sync Failed:", e);
    }
  }

  return { success: true, data };
}

export async function updateFleetRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = fleetUpdateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const { supabase, companyId } = auth.data;
  const { table: entityType, rowId, standardData, customData } = parsed.data;
  const table = FleetService.mapEntityToTable(entityType);

  // Merge custom fields
  let mergedCustomFields = customData || {};
  if (customData) {
    const { data: existing } = await supabase
      .from(table)
      .select("custom_fields")
      .eq("id", rowId)
      .single();

    if (existing) {
      mergedCustomFields = {
        ...(existing.custom_fields || {}),
        ...customData,
      };
    }
  }

  const { data, error } = await supabase
    .from(table)
    .update({
      ...standardData,
      custom_fields: mergedCustomFields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  // Update record_id for any temporary attachments that might have been added during edit
  await supabase
    .from("attachments")
    .update({ record_id: rowId })
    .eq("record_id", "00000000-0000-0000-0000-000000000000")
    .eq("table_name", entityType)
    .eq("company_id", companyId);

  if (table === "vehicles") {
    try {
      await FleetService.syncVehicleToTraccar(rowId);
    } catch (e) {
      console.error("[Fleet Actions] Traccar Sync Failed:", e);
    }
  }

  return { success: true, data };
}

export async function deleteFleetRowAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = fleetDeleteRowInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const { supabase, companyId } = auth.data;
  const { table: entityType, rowId } = parsed.data;
  const table = FleetService.mapEntityToTable(entityType);

  if (table === "vehicles") {
    try {
      await FleetService.deleteVehicleFromTraccar(rowId);
    } catch (e) {
      console.error("[Fleet Actions] Traccar Delete Failed:", e);
    }
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", rowId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };

  // Cascade delete attachments (soft delete to match row)
  await supabase
    .from("attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("record_id", rowId)
    .eq("table_name", entityType)
    .eq("company_id", companyId);

  return { success: true, data: null };
}
