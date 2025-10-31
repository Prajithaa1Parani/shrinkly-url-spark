import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geo lookup with caching
async function lookupCountry(ip: string, supabase: any): Promise<string> {
  // Check cache first
  const { data: cached } = await supabase
    .from('geo_cache')
    .select('country')
    .eq('ip', ip)
    .single();

  if (cached) {
    return cached.country;
  }

  // Lookup via ip-api.com (free, no key required)
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (response.ok) {
      const data = await response.json();
      const country = data.country || 'Unknown';

      // Cache result
      await supabase
        .from('geo_cache')
        .upsert({ ip, country, last_seen: new Date().toISOString() });

      return country;
    }
  } catch (error) {
    console.error('Geo lookup error:', error);
  }

  return 'Unknown';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { shortId } = await req.json();

    if (!shortId) {
      throw new Error('Short ID required');
    }

    // Lookup link by short_id or custom_alias
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('*')
      .or(`short_id.eq.${shortId},custom_alias.eq.${shortId}`)
      .single();

    if (linkError || !link) {
      throw new Error('Link not found');
    }

    // Check if disabled
    if (link.disabled) {
      throw new Error('This link has been disabled');
    }

    // Check if expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new Error('This link has expired');
    }

    console.log('Redirect:', { shortId, url: link.long_url });

    return new Response(
      JSON.stringify({ url: link.long_url, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Redirect error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
