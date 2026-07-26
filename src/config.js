import 'dotenv/config';

const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Fehlende Railway-Variable: ${key}`);
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  timezone: process.env.EVENT_TIMEZONE || 'Africa/Johannesburg',
  testMode: String(process.env.TEST_MODE || 'true').toLowerCase() === 'true',
  roles: {
    owner: process.env.OWNER_ROLE_ID || '',
    management: process.env.MANAGEMENT_ROLE_ID || '',
    moderator: process.env.MODERATOR_ROLE_ID || '',
    member: process.env.MEMBER_ROLE_ID || ''
  }
};
