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
  private static DOCUMENSO_URL = process.env.NEXT_PUBLIC_DOCUMENSO_URL || "http://localhost:3000";
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
   * Syncs status with Documenso API (Local instance).
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
    recipientEmail,
    recipientName,
    pdfUrl,
    moduleName,
    recordId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    title: string;
    recipientEmail: string;
    recipientName: string;
    pdfUrl: string;
    moduleName: string;
    recordId: string;
  }) {
    // 1. Call Documenso API to create the envelope
    // This is a placeholder for the actual API call logic
    // We would use the DOCUMENSO_API_KEY here to hide the complexity from Abel.
    
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
}
