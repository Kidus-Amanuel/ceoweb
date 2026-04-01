import { calculateDays } from "@/utils/table-utils";

export const HRPayloadMapper = {
  getStandardKeys(view: "list" | "leaves" | "types") {
    if (view === "list") {
      return [
        "first_name", "last_name", "email", "employee_code", 
        "department_id", "position_id", "status", "basic_salary", 
        "hourly_rate", "hire_date", "termination_date", "job_title", "user_id"
      ];
    }
    if (view === "leaves") {
      return ["leave_type_id", "start_date", "end_date", "days_taken", "reason", "status"];
    }
    return ["name", "paid", "days_per_year", "carry_over"];
  },

  mapCommonPayload(view: "list" | "leaves" | "types", payloadData: any) {
    const payload: Record<string, any> = {};
    const keys = this.getStandardKeys(view);
    
    // Map standard DB fields
    Object.keys(payloadData).forEach((key) => {
      if (keys.includes(key)) {
        let val = payloadData[key];
        // Ensure currency nested amounts are squashed flat before transmitting
        if (val && typeof val === "object" && "amount" in val) {
          val = (val as any).amount;
        }
        payload[key] = val;
      }
    });

    return payload;
  },

  buildUpdatePayload(view: "list" | "leaves" | "types", id: string, updatedFields: any, rawTargetItem: any) {
    const payload = this.mapCommonPayload(view, updatedFields);
    payload.id = id;

    if (view === "list" && payload.first_name && !payload.last_name) {
      const nameInput = String(payload.first_name).trim();
      const parts = nameInput.split(/\s+/);
      if (parts.length > 1) {
        payload.first_name = parts[0];
        payload.last_name = parts.slice(1).join(" ");
      } else {
        payload.first_name = nameInput;
        payload.last_name = "-"; 
      }
    }

    if (view === "leaves" && (payload.start_date || payload.end_date)) {
      payload.days_taken = calculateDays(
        payload.start_date || rawTargetItem?.start_date,
        payload.end_date || rawTargetItem?.end_date
      );
    }
    
    const mergedCustom = {
      ...(rawTargetItem?.custom_fields || {}),
      ...(updatedFields.customValues || {})
    };
    
    if (Object.keys(mergedCustom).length > 0) {
      payload.custom_fields = mergedCustom;
    }

    return payload;
  },

  buildAddPayload(view: "list" | "leaves" | "types", newItem: any, companyId: string, activeEmployeeId?: string | null) {
    const payload = this.mapCommonPayload(view, newItem);
    payload.company_id = companyId;
    payload.custom_fields = newItem.customValues || {};

    if (view === "list") {
      // Split first_name into first and last if we only got one "name" field from UI
      if (payload.first_name && !payload.last_name) {
        const nameInput = String(payload.first_name).trim();
        const parts = nameInput.split(/\s+/);
        if (parts.length > 1) {
          payload.first_name = parts[0];
          payload.last_name = parts.slice(1).join(" ");
        } else {
          payload.first_name = nameInput;
          payload.last_name = "-"; // Satisfy database requirement if only one name is given
        }
      }
      payload.employee_code = payload.employee_code || `EMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    } else if (view === "leaves") {
      payload.days_taken = calculateDays(payload.start_date, payload.end_date);
      payload.employee_id = activeEmployeeId;
      payload.status = payload.status || "pending";
    } else {
      payload.paid = payload.paid ?? true;
      payload.carry_over = payload.carry_over ?? false;
    }

    return payload;
  }
};
