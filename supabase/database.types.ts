/**
 * TypeScript Types for Multi-Tenant ERP Database Schema
 * Auto-generated type definitions matching Supabase schema
 *
 * Usage:
 * import type { Database } from './database.types'
 * type Company = Database['public']['Tables']['companies']['Row']
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserType = "super_admin" | "company_user";
export type UserStatus = "active" | "suspended" | "inactive";
export type CompanyStatus = "active" | "suspended" | "trial";
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";
export type DepartmentType =
  | "hr"
  | "crm"
  | "fleet"
  | "inventory"
  | "finance"
  | "operations"
  | "it";
export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "approve";
export type ModuleName = "crm" | "hr" | "fleet" | "inventory" | "finance";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          is_active: boolean;
          status: CompanyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          is_active?: boolean;
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          is_active?: boolean;
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          company_id: string | null;
          user_type: UserType;
          full_name: string | null;
          avatar_url: string | null;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id?: string | null;
          user_type?: UserType;
          full_name?: string | null;
          avatar_url?: string | null;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_type?: UserType;
          full_name?: string | null;
          avatar_url?: string | null;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_users: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          role_id: string;
          position: string | null;
          status: UserStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          role_id: string;
          position?: string | null;
          status?: UserStatus;
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string;
          role_id?: string;
          position?: string | null;
          status?: UserStatus;
          joined_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          module: ModuleName;
          action: PermissionAction;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          module: ModuleName;
          action: PermissionAction;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          module?: ModuleName;
          action?: PermissionAction;
          created_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          name: ModuleName;
          display_name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: ModuleName;
          display_name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: ModuleName;
          display_name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          owner_id: string;
          status: ProjectStatus;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          owner_id: string;
          status?: ProjectStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          status?: ProjectStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          employee_number: string;
          department: DepartmentType | null;
          position: string | null;
          hire_date: string | null;
          termination_date: string | null;
          salary: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          employee_number: string;
          department?: DepartmentType | null;
          position?: string | null;
          hire_date?: string | null;
          termination_date?: string | null;
          salary?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          profile_id?: string;
          employee_number?: string;
          department?: DepartmentType | null;
          position?: string | null;
          hire_date?: string | null;
          termination_date?: string | null;
          salary?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          assigned_to: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          assigned_to?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          assigned_to?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          vehicle_number: string;
          make: string | null;
          model: string | null;
          year: number | null;
          license_plate: string | null;
          assigned_driver_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_number: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          license_plate?: string | null;
          assigned_driver_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_number?: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          license_plate?: string | null;
          assigned_driver_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          table_name: string;
          record_id: string | null;
          action: "INSERT" | "UPDATE" | "DELETE";
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          table_name: string;
          record_id?: string | null;
          action: "INSERT" | "UPDATE" | "DELETE";
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          table_name?: string;
          record_id?: string | null;
          action?: "INSERT" | "UPDATE" | "DELETE";
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_user_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      get_user_type: {
        Args: Record<PropertyKey, never>;
        Returns: UserType | null;
      };
      has_permission: {
        Args: {
          p_module: ModuleName;
          p_action: PermissionAction;
        };
        Returns: boolean;
      };
      get_user_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          module: ModuleName;
          action: PermissionAction;
        }[];
      };
      get_user_role_info: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          company_id: string;
          company_name: string;
          role_id: string;
          role_name: string;
          position: string | null;
          status: UserStatus;
          user_type: UserType;
          permissions: {
            module: ModuleName;
            action: PermissionAction;
          }[];
        };
      };
      handle_user_invitation: {
        Args: {
          p_user_id: string;
          p_company_id: string;
          p_role_id: string;
          p_position?: string;
        };
        Returns: string;
      };
      assign_role_permissions: {
        Args: {
          p_role_id: string;
          p_permissions: Json;
        };
        Returns: number;
      };
      is_company_owner: {
        Args: {
          p_company_id?: string;
        };
        Returns: boolean;
      };
      get_company_stats: {
        Args: {
          p_company_id?: string;
        };
        Returns: {
          total_users: number;
          active_users: number;
          total_roles: number;
          total_projects: number;
          total_employees: number;
        };
      };
      validate_company_access: {
        Args: {
          p_table_name: string;
          p_record_id: string;
        };
        Returns: boolean;
      };
      log_audit: {
        Args: {
          p_table_name: string;
          p_record_id: string;
          p_action: "INSERT" | "UPDATE" | "DELETE";
          p_old_data?: Json;
          p_new_data?: Json;
        };
        Returns: string;
      };
    };
  };
}

// Helper types for common use cases
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type CompanyUser = Database["public"]["Tables"]["company_users"]["Row"];
export type RolePermission =
  Database["public"]["Tables"]["role_permissions"]["Row"];
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

// Permission type
export interface Permission {
  module: ModuleName;
  action: PermissionAction;
}

// Role info from get_user_role_info()
export interface UserRoleInfo {
  user_id: string;
  company_id: string;
  company_name: string;
  role_id: string;
  role_name: string;
  position: string | null;
  status: UserStatus;
  user_type: UserType;
  permissions: Permission[];
}

// Company stats from get_company_stats()
export interface CompanyStats {
  total_users: number;
  active_users: number;
  total_roles: number;
  total_projects: number;
  total_employees: number;
}
