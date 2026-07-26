# Nythera V3 Hotfix

Behebt:
- `discord_user_id` NOT NULL Fehler bei `/register`
- `Nythera Management didn't respond in time` bei `/setup`
- fehlende `channel_setup_log` Tabelle

Reihenfolge:
1. `supabase-hotfix.sql` in Supabase ausführen.
2. Bot-Dateien hochladen.
3. Neuen Railway-Deploy starten.
4. `/register` und `/setup` erneut testen.
