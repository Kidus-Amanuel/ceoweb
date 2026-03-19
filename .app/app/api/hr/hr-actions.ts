"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HRService } from "@/services/hr.service";
import {
  hrCreateCustomFieldInputSchema,
  hrUpdateCustomFieldInputSchema,
  hrDeleteCustomFieldInputSchema,
} from "@/validators/hr";

type ActionResult<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

const zodErrorToText = (error: z.ZodError) =>
  error.issues
    .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
    .join(" | ");

async function getAuthContext(companyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, companyId, userId: user.id };
}

export async function createHRCustomFieldAction(
  input: unknown,
): Promise<ActionResult<any>> {
  const parsed = hrCreateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: zodErrorToText(parsed.error) };

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth) return { success: false, error: "Unauthorized" };

  const response = await HRService.saveColumnDefinition({
    supabase: auth.supabase,
    companyId: auth.companyId,
    entityType: parsed.data.entityType as any,
    column: {
      field_label: parsed.data.fieldLabel,
      field_name: parsed.data.fieldName || "",
      field_type: parsed.data.fieldType as any,
      field_options: parsed.data.fieldOptions,
      is_required: parsed.data.isRequired,
    },
  });

  if (response.error) return { success: false, error: response.error };
  return { success: true, data: response.data };
}

export async function updateHRCustomFieldAction(
  input: unknown,
): Promise<ActionResult<any>> {
  const parsed = hrUpdateCustomFieldInputSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: zodErrorToText(parsed.error) };

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth) return { success: false, error: "Unauthorized" };

  const response = await HRService.saveColumnDefinition({
    supabase: auth.supabase,
    companyId: auth.companyId,
    entityType: parsed.data.entityType as any,
    column: {
      id: parsed.data.fieldId,
      field_label: parsed.data.fieldLabel,
      field_name: parsed.data.fieldName || "",
      field_type: parsed.data.fieldType as any,
      field_options: parsed.data.fieldOptions,
      is_required: parsed.data.isRequired,
    },
  });

  if (response.error) return { success: false, error: response.error };
  return { success: true, data: response.data };
}

export async function deleteHRCustomFieldAction(
  input: unknown,
): Promise<ActionResult<any>> {
  const parsed = hrDeleteCustomFieldInputSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: zodErrorToText(parsed.error) };

  const auth = await getAuthContext(parsed.data.companyId);
  if (!auth) return { success: false, error: "Unauthorized" };

  const response = await HRService.deleteCustomField({
    supabase: auth.supabase,
    companyId: auth.companyId,
    entityType: parsed.data.entityType,

    fieldId: parsed.data.fieldId,
  });

  if (response.error) return { success: false, error: response.error };
  return { success: true, data: null };
}
