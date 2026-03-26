import { SupabaseClient } from "@supabase/supabase-js";

export interface SignatureRequest {
  id: string;
  company_id: string;
  title: string;
  status: string;
  envelope_id: string;
  module_name: string;
  record_id: string;
  created_at: string;
  document_url?: string;
}

export class SigningService {
  private static DOCUMENSO_URL = process.env.NEXT_PUBLIC_DOCUMENSO_URL || "https://documentsign.onrender.com";
  private static API_KEY = process.env.DOCUMENSO_API_KEY;

  /**
   * Fetches all signing requests for a specific company.
   */
  public static async getCompanySignatures(
    supabase: SupabaseClient,
    companyId: string
  ): Promise<SignatureRequest[]> {
    const { data, error } = await supabase
      .from("document_signing")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as SignatureRequest[];
  }

  /**
   * Syncs status with Documenso API (Production).
   */
  public static async syncEnvelopeStatus(envelopeId: string): Promise<string> {
    const response = await fetch(`${this.DOCUMENSO_URL}/api/v2/envelopes/${envelopeId}`, {
      headers: {
        "Authorization": `Bearer ${this.API_KEY}`,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch envelope status from Documenso.");
    const data = await response.json();
    return data.status; // e.g., 'COMPLETED', 'PENDING'
  }

  /**
   * Creates a new signing request (White-labeled).
   */
  public static async createRequest({
    supabase,
    companyId,
    title,
    moduleName,
    recordId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    title: string;
    moduleName: string;
    recordId: string;
  }) {
    const { data, error } = await supabase
      .from("document_signing")
      .insert({
        company_id: companyId,
        title,
        module_name: moduleName,
        record_id: recordId,
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Generates a "Jump Link" to the Documenso documents dashboard.
   * If Abel is logged into his browser, this takes him directly to his docs.
   */
  public static getManageUrl(): string {
    const teamId = "personal_mxtbdheonrmwhfbs"; // Hardcoded team ID based on your URL
    return `${this.DOCUMENSO_URL}/t/${teamId}/documents`;
  }

  /**
   * Returns a direct preparation link for a specific envelope.
   */
  public static getPrepareUrl(envelopeId: string): string {
    return `${this.DOCUMENSO_URL}/envelopes/${envelopeId}/prepare`;
  }
}
