"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/utils/logger";
import { inventoryService } from "@/services/inventory/inventory.service";
import {
  inventoryCompanyScopeSchema,
  inventoryCreateCustomFieldInputSchema,
  inventoryCreateRowInputSchema,
  inventoryDeleteCustomFieldInputSchema,
  inventoryDeleteRowInputSchema,
  inventoryEntityTypeSchema,
  inventoryTableViewInputSchema,
  inventoryUpdateCustomFieldInputSchema,
  inventoryUpdateRowInputSchema,
} from "@/validators/inventory";

type ActionResult<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

type AuthContext = {
  companyId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

const zodErrorToText = (error: z.ZodError) =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join(" | ");

async function getAuthContext(
  companyId: string,
): Promise<ActionResult<AuthContext>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn({ companyId }, "Inventory auth failed");
    return { success: false, error: "Unauthorized" };
  }

  const metadata = user.user_metadata || {};
  const isSuperAdmin =
    (metadata.user_type || metadata.userType) === "super_admin";

  const tenantContext = await inventoryService.resolveTenantContext({
    supabase,
    companyId,
    userId: user.id,
    isSuperAdmin,
  });

  if (tenantContext.error || !tenantContext.data) {
    logger.warn(
      { companyId, userId: user.id, error: tenantContext.error },
      "Inventory tenant resolution failed",
    );
    return {
      success: false,
      error: tenantContext.error || "Company context unavailable",
    };
  }

  return {
    success: true,
    data: {
      companyId: tenantContext.data.companyId,
      userId: user.id,
      supabase,
    },
  };
}

export async function getInventoryOverviewAction(input: unknown): Promise<
  ActionResult<{
    totalInventoryValue: number;
    lowStockAlertCount: number;
    totalActiveSuppliers: number;
    recentStockMovements: Record<string, unknown>[];
  }>
> {
  const parsed = inventoryCompanyScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.getInventoryOverview({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
  });

  if (response.error || !response.data) {
    return {
      success: false,
      error: response.error || "Failed to load inventory overview",
    };
  }

  return { success: true, data: response.data };
}

export async function getInventoryRowsAction(input: unknown): Promise<
  ActionResult<{
    rows: Record<string, unknown>[];
    totalRows: number;
  }>
> {
  const parsed = inventoryTableViewInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn(
      { error: parsed.error.flatten() },
      "Inventory rows validation failed",
    );
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const result = await inventoryService.listRows({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    table: parsed.data.table,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    search: parsed.data.search,
  });

  if (result.error) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: {
      rows: result.data?.data ?? [],
      totalRows: result.data?.count ?? 0,
    },
  };
}

export async function getInventoryProductsOptionsAction(
  input: unknown,
): Promise<ActionResult<{ label: string; value: string }[]>> {
  const parsed = inventoryCompanyScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.listProductsForSelect({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data ?? [] };
}

export async function getInventorySuppliersOptionsAction(
  input: unknown,
): Promise<ActionResult<{ label: string; value: string }[]>> {
  const parsed = inventoryCompanyScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.listSuppliersForSelect({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data ?? [] };
}

export async function getInventoryWarehousesOptionsAction(
  input: unknown,
): Promise<ActionResult<{ label: string; value: string }[]>> {
  const parsed = inventoryCompanyScopeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.listWarehousesForSelect({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data ?? [] };
}

export async function getInventoryCustomFieldsAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>[]>> {
  const parsed = inventoryCompanyScopeSchema
    .extend({ entityType: inventoryEntityTypeSchema })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.listCustomFields({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    entityType: parsed.data.entityType,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: response.data ?? [] };
}

export async function createInventoryCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = inventoryCreateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.createCustomField({
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
    return {
      success: false,
      error: response.error || "Failed to create custom field",
    };
  }

  return { success: true, data: response.data };
}

export async function updateInventoryCustomFieldAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = inventoryUpdateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.updateCustomField({
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

  return { success: true, data: response.data };
}

export async function deleteInventoryCustomFieldAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = inventoryDeleteCustomFieldInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const response = await inventoryService.deleteCustomField({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    fieldId: parsed.data.fieldId,
  });

  if (response.error) {
    return { success: false, error: response.error };
  }

  return { success: true, data: null };
}

export async function createInventoryRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = inventoryCreateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn(
      { error: parsed.error.flatten() },
      "Inventory create row validation failed",
    );
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const result = await inventoryService.createRow({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    userId: auth.data.userId,
    payload: parsed.data,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error || "Failed to create row" };
  }

  return { success: true, data: result.data };
}

export async function updateInventoryRowAction(
  input: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = inventoryUpdateRowInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn(
      { error: parsed.error.flatten() },
      "Inventory update row validation failed",
    );
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const result = await inventoryService.updateRow({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    userId: auth.data.userId,
    payload: parsed.data,
    rowId: parsed.data.rowId,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error || "Failed to update row" };
  }

  return { success: true, data: result.data };
}

export async function deleteInventoryRowAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = inventoryDeleteRowInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn(
      { error: parsed.error.flatten() },
      "Inventory delete row validation failed",
    );
    return { success: false, error: zodErrorToText(parsed.error) };
  }

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth.success || !auth.data) {
    return { success: false, error: auth.error };
  }

  const result = await inventoryService.deleteRow({
    supabase: auth.data.supabase,
    companyId: auth.data.companyId,
    table: parsed.data.table,
    rowId: parsed.data.rowId,
  });

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: true, data: null };
}
