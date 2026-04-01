import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceResult } from "./hr.service";
import { hrCreateLeaveInputSchema, hrUpdateLeaveInputSchema } from "../validators/hr";

export class HRLeaveService {
  /**
   * List paginated leaves with optional filters.
   */
  public static async listLeaves({
    supabase,
    companyId,
    page = 1,
    pageSize = 50,
    employeeId,
    status,
    search,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page?: number;
    pageSize?: number;
    employeeId?: string | null;
    status?: string | null;
    search?: string | null;
  }): Promise<ServiceResult<{ data: any[]; total: number; page: number; pageSize: number }>> {
    if (!companyId) return { error: "Company ID is required" };

    let query = supabase
      .from("leaves")
      .select(
        `
        *,
        employee:employees!inner (id, first_name, last_name, employee_code),
        leave_type:leave_types (id, name)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (status) query = query.eq("status", status);
    
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_code.ilike.%${search}%`,
        { foreignTable: "employee" },
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("start_date", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };

    return { 
      data: { 
        data: data || [], 
        total: count || 0,
        page,
        pageSize
      } 
    };
  }

  /**
   * Create a new leave with overlap validation.
   */
  public static async createLeave({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrCreateLeaveInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { companyId, ...insertData } = validated.data;

    // Overlapping leave validation
    if (insertData.employee_id && insertData.start_date && insertData.end_date) {
      const { data: overlaps, error: overlapError } = await supabase
        .from("leaves")
        .select("id")
        .eq("company_id", companyId)
        .eq("employee_id", insertData.employee_id)
        .is("deleted_at", null)
        .neq("status", "rejected")
        .neq("status", "cancelled")
        .lte("start_date", insertData.end_date)
        .gte("end_date", insertData.start_date);

      if (overlapError) return { error: overlapError.message };
      if (overlaps && overlaps.length > 0) {
        return { error: "Employee already has a leave overlapping with these dates." };
      }
    }

    const { data, error } = await supabase
      .from("leaves")
      .insert({ ...insertData, company_id: companyId })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Update an existing leave with overlap validations.
   */
  public static async updateLeave({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrUpdateLeaveInputSchema.safeParse(payload);
    if (!validated.success) {
      return { error: JSON.parse(validated.error.message)[0]?.message || "Validation failed" };
    }

    const { id, companyId, custom_fields, ...rest } = validated.data;
    
    // Validate overlaps if dates or employee change
    if (rest.employee_id || rest.start_date || rest.end_date) {
      const { data: existingLeave } = await supabase
        .from("leaves")
        .select("employee_id, start_date, end_date")
        .eq("id", id)
        .single();

      if (existingLeave) {
        const checkEmployeeId = rest.employee_id || existingLeave.employee_id;
        const checkStartDate = rest.start_date || existingLeave.start_date;
        const checkEndDate = rest.end_date || existingLeave.end_date;

        const { data: overlaps, error: overlapError } = await supabase
          .from("leaves")
          .select("id")
          .eq("company_id", companyId)
          .eq("employee_id", checkEmployeeId)
          .neq("id", id) 
          .is("deleted_at", null)
          .neq("status", "rejected")
          .neq("status", "cancelled")
          .lte("start_date", checkEndDate)
          .gte("end_date", checkStartDate);

        if (overlapError) return { error: overlapError.message };
        if (overlaps && overlaps.length > 0) {
          return { error: "Employee already has a leave overlapping with these dates." };
        }
      }
    }

    const updatedPayload: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
    if (custom_fields !== undefined) {
      updatedPayload.custom_fields = custom_fields;
    }

    const { data, error } = await supabase
      .from("leaves")
      .update(updatedPayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Soft delete a leave log.
   */
  public static async deleteLeave({
    supabase,
    companyId,
    id,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    id: string;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("leaves")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  }
}
