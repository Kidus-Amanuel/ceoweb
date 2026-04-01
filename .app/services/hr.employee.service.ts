import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceResult } from "./hr.service";
import { hrCreateEmployeeInputSchema, hrUpdateEmployeeInputSchema } from "../validators/hr";

export class HREmployeeService {
  /**
   * List paginated employees with optional search and status filter.
   */
  public static async listEmployees({
    supabase,
    companyId,
    page = 1,
    pageSize = 50,
    search,
    status,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }): Promise<ServiceResult<{ data: any[]; total: number; page: number; pageSize: number }>> {
    if (!companyId) return { error: "Company ID is required" };

    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("employees")
      .select(
        `
        *,
        department:departments (id, name),
        position:positions (id, title),
        leaves:leaves (id, start_date, end_date, status, leave_type_id)
      `,
        { count: "exact" },
      )
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`,
      );
    }
    
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("first_name", { ascending: true })
      .range(from, to);

    if (error) return { error: error.message };

    // Derived flags for UI
    const enrichedData = (data || []).map((emp) => {
      const activeLeave = emp.leaves?.find(
        (l: any) =>
          l.status === "approved" &&
          l.start_date <= today &&
          l.end_date >= today,
      );

      return {
        ...emp,
        on_active_leave: !!activeLeave,
        current_leave: activeLeave || null,
      };
    });

    return { 
      data: { 
        data: enrichedData, 
        total: count || 0,
        page,
        pageSize
      } 
    };
  }

  /**
   * Get a single employee
   */
  public static async getEmployee({
    supabase,
    companyId,
    id,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    id: string;
  }): Promise<ServiceResult<any>> {
    if (!companyId || !id) return { error: "Company ID and ID are required" };

    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        department:departments (id, name),
        position:positions (id, title),
        leaves:leaves (id, start_date, end_date, status, reason, leave_type_id),
        documents:employee_documents (*)
      `,
      )
      .eq("id", id)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Create a new employee with standard validations.
   */
  public static async createEmployee({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrCreateEmployeeInputSchema.safeParse(payload);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      const path = firstIssue.path.join(".");
      console.error("[HREmployeeService] Validation failed:", JSON.stringify(validated.error.issues, null, 2));
      return { error: `${path ? `${path}: ` : ""}${firstIssue.message}` };
    }

    const { companyId, ...insertData } = validated.data;

    const { data, error } = await supabase
      .from("employees")
      .insert({ ...insertData, company_id: companyId })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Update an existing employee.
   */
  public static async updateEmployee({
    supabase,
    payload,
  }: {
    supabase: SupabaseClient;
    payload: unknown;
  }): Promise<ServiceResult<any>> {
    const validated = hrUpdateEmployeeInputSchema.safeParse(payload);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      const path = firstIssue.path.join(".");
      console.error("[HREmployeeService] Update Validation failed:", JSON.stringify(validated.error.issues, null, 2));
      return { error: `${path ? `${path}: ` : ""}${firstIssue.message}` };
    }

    const { id, companyId, custom_fields, ...rest } = validated.data;
    
    const updatedPayload: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
    if (custom_fields !== undefined) {
      updatedPayload.custom_fields = custom_fields;
    }

    const { data, error } = await supabase
      .from("employees")
      .update(updatedPayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  }

  /**
   * Soft delete an employee.
   */
  public static async deleteEmployee({
    supabase,
    companyId,
    id,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    id: string;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  }
}
