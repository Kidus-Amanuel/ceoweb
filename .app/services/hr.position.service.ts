import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceResult } from "./hr.service";
import * as z from "zod";
import { companyScopeSchema, customDataSchema } from "../validators/shared";
import { positionStandardSchema } from "../validators/hr";

const hrCreatePositionInputSchema = companyScopeSchema.merge(positionStandardSchema).extend({
  custom_fields: customDataSchema.optional(),
});

const hrUpdatePositionInputSchema = companyScopeSchema.merge(positionStandardSchema.partial()).extend({
  id: z.string().uuid("Invalid position id"),
  custom_fields: customDataSchema.optional(),
});

export class HRPositionService {
  /**
   * List positions
   */
  public static async listPositions({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<ServiceResult<any[]>> {
    if (!companyId) return { error: "Company ID is required" };

    const { data, error } = await supabase
      .from("positions")
      .select("*, department:departments(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("title", { ascending: true });

    if (error) return { error: error.message };

    return { data: data || [] };
  }

  /**
   * Create a new position
   */
  public static async createPosition({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrCreatePositionInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { companyId, ...insertData } = validated.data;

    const { data, error } = await supabase
      .from("positions")
      .insert({ ...insertData, company_id: companyId })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Update an existing position
   */
  public static async updatePosition({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrUpdatePositionInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { id, companyId, custom_fields, ...rest } = validated.data;
    
    const updatedPayload: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
    if (custom_fields !== undefined) {
      updatedPayload.custom_fields = custom_fields;
    }

    const { data, error } = await supabase
      .from("positions")
      .update(updatedPayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Soft delete a position
   */
  public static async deletePosition({
    supabase,
    companyId,
    id,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    id: string;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("positions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  }
}
