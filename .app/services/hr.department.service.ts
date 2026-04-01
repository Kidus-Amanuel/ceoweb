import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceResult } from "./hr.service";
import { hrCreateDepartmentInputSchema, hrUpdateDepartmentInputSchema } from "../validators/hr";

export class HRDepartmentService {
  /**
   * List departments
   */
  public static async listDepartments({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<ServiceResult<any[]>> {
    if (!companyId) return { error: "Company ID is required" };

    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) return { error: error.message };

    return { data: data || [] };
  }

  /**
   * Create a new department
   */
  public static async createDepartment({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrCreateDepartmentInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { companyId, ...insertData } = validated.data;

    const { data, error } = await supabase
      .from("departments")
      .insert({ ...insertData, company_id: companyId })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Update an existing department
   */
  public static async updateDepartment({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrUpdateDepartmentInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { id, companyId, custom_fields, ...rest } = validated.data;
    
    const updatedPayload: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
    if (custom_fields !== undefined) {
      updatedPayload.custom_fields = custom_fields;
    }

    const { data, error } = await supabase
      .from("departments")
      .update(updatedPayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Soft delete a department
   */
  public static async deleteDepartment({
    supabase,
    companyId,
    id,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    id: string;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("departments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  }
}
