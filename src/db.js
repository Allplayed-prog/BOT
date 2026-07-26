import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export async function must(query, label = 'Datenbankabfrage') {
  const { data, error, count } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
}

export async function getSetting(key) {
  const { data } = await must(
    db.from('system_settings').select('value').eq('key', key).maybeSingle(),
    `Einstellung ${key} laden`
  );
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  await must(
    db.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    `Einstellung ${key} speichern`
  );
}
