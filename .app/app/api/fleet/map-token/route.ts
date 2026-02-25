import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FleetService } from '@/services/fleet.service';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate the ERP user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Determine User's Company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Company association not found' }, { status: 403 });
    }

    // 2. Lookup the mapped Traccar User
    const { data: tenantMapping, error: mappingError } = await supabase
      .from('traccar_tenant_mappings')
      .select('traccar_user_id')
      .eq('company_id', profile.company_id)
      .single();

    let traccarUserId: number;

    // 3. Auto-provision mapping if missing
    if (mappingError || !tenantMapping) {
      console.log(`[Fleet] Creating new Traccar User for Company: ${profile.company_id}`);
      try {
        const newTraccarUser = await FleetService.createTraccarUser({
          name: `Company_${profile.company_id.substring(0, 8)}_Fleet_Admin`,
          email: `${profile.company_id}@erp-system.local`, // internal dummy email
          password: crypto.randomUUID(), // Highly secure password never meant to be entered manually
        });
        
        // Save the mapping back to ERP core schema
        const { data: newMapping, error: insertError } = await supabase
          .from('traccar_tenant_mappings')
          .insert({
            company_id: profile.company_id,
            traccar_user_id: newTraccarUser.id
          })
          .select('traccar_user_id')
          .single();

        if (insertError) throw insertError;
        traccarUserId = newMapping.traccar_user_id;

      } catch (provisionError) {
        console.error('[Fleet] Tenant Provisioning Error:', provisionError);
        return NextResponse.json({ error: 'Failed to provision fleet tenant' }, { status: 500 });
      }
    } else {
      traccarUserId = tenantMapping.traccar_user_id;
    }

    // 4. Request the Secure Token
    console.log(`[Fleet] Requesting Session Token for Traccar User: ${traccarUserId}`);
    const token = await FleetService.getSessionToken(traccarUserId);

    return NextResponse.json({ token });

  } catch (error: any) {
    console.error('[Fleet] Map Token Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
