import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base62 characters for short ID generation
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function generateShortId(length = 6): string {
  let result = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  for (let i = 0; i < length; i++) {
    result += BASE62[bytes[i] % BASE62.length];
  }
  
  return result;
}

function validateCustomAlias(alias: string | null): { valid: boolean; error?: string } {
  if (!alias) return { valid: true };
  
  // Reserved names
  const reserved = ['admin', 'stats', 'result', 'auth', 'api', 'health'];
  if (reserved.includes(alias.toLowerCase())) {
    return { valid: false, error: 'This alias is reserved' };
  }
  
  // Check format
  if (!/^[A-Za-z0-9_-]{3,50}$/.test(alias)) {
    return { valid: false, error: 'Alias must be 3-50 characters (letters, numbers, hyphens, underscores)' };
  }
  
  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { longUrl, customAlias, expiryDays } = await req.json();

    // Validate URL
    if (!longUrl || typeof longUrl !== 'string') {
      throw new Error('Invalid URL');
    }

    try {
      const url = new URL(longUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('URL must use http or https protocol');
      }
    } catch {
      throw new Error('Invalid URL format');
    }

    // Validate custom alias if provided
    if (customAlias) {
      const validation = validateCustomAlias(customAlias);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check if alias already exists
      const { data: existingAlias } = await supabase
        .from('links')
        .select('id')
        .eq('custom_alias', customAlias)
        .single();

      if (existingAlias) {
        throw new Error('This alias is already taken');
      }
    }

    // Generate short ID with collision checking
    let shortId = customAlias || generateShortId(6);
    let attempts = 0;
    const maxAttempts = 5;

    if (!customAlias) {
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('links')
          .select('id')
          .eq('short_id', shortId)
          .single();

        if (!existing) break;

        // Collision detected, try again with longer ID
        shortId = generateShortId(6 + Math.floor(attempts / 2));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique short ID');
      }
    }

    // Calculate expiry date
    let expiresAt = null;
    if (expiryDays && typeof expiryDays === 'number' && expiryDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryDays);
      expiresAt = expiry.toISOString();
    }

    // Insert link
    const { data: link, error: insertError } = await supabase
      .from('links')
      .insert({
        short_id: shortId,
        long_url: longUrl,
        custom_alias: customAlias || null,
        expires_at: expiresAt,
        created_by_ip: 'unknown', // In production, would extract from request
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to create short link');
    }

    console.log('Link created:', { shortId, longUrl, customAlias });

    return new Response(
      JSON.stringify({ shortId, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
