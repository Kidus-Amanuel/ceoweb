import { describe, expect, it } from "vitest";
import {
  crmCreateCustomFieldInputSchema,
  crmCreateRowInputSchema,
  crmDeleteRowInputSchema,
} from "@/validators/crm";

const companyId = "11111111-1111-4111-8111-111111111111";
const rowId = "22222222-2222-4222-8222-222222222222";

describe("CRM validators", () => {
  it("accepts valid customer row payload", () => {
    const parsed = crmCreateRowInputSchema.safeParse({
      companyId,
      table: "customers",
      standardData: {
        name: "Acme Corp",
        email: "sales@acme.com",
        status: "active",
      },
      customData: {
        account_score: 91,
        vip: true,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts valid table name for delete row payload", () => {
    const parsed = crmDeleteRowInputSchema.safeParse({
      companyId,
      rowId,
      table: "customers",
      page: 1,
      pageSize: 50,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts select custom fields without options", () => {
    const parsed = crmCreateCustomFieldInputSchema.safeParse({
      companyId,
      entityType: "customers",
      fieldLabel: "Lifecycle Stage",
      fieldType: "select",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts date custom field type", () => {
    const parsed = crmCreateCustomFieldInputSchema.safeParse({
      companyId,
      entityType: "deals",
      fieldLabel: "Renewal Date",
      fieldName: "renewal_date",
      fieldType: "date",
    });

    expect(parsed.success).toBe(true);
  });
});
