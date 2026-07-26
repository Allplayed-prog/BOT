import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

export const COLORS = {
  primary: 0x5b7cff,
  success: 0x36d399,
  warning: 0xff9f43,
  danger: 0xff5f74,
  purple: 0x7a4dff
};

export function embed(title, description, color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Nythera Management' })
    .setTimestamp();
}

export function registrationPanel() {
  return {
    embeds: [embed(
      '👤 NYTHERA REGISTRIERUNG',
      [
        '**So funktioniert es**',
        '1. Klicke auf **Registrieren**',
        '2. Trage Ingame-ID, Vorname und Nachname ein',
        '3. Das Management prüft deinen Antrag',
        '4. Nach der Freigabe erhältst du Rolle und Nickname',
        '',
        'Danach kannst du Events, Panels und Auszahlungen nutzen.'
      ].join('\n')
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('register:start').setLabel('Registrieren').setEmoji('✅').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('register:status').setLabel('Mein Status').setEmoji('👤').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('register:help').setLabel('Hilfe').setEmoji('ℹ️').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function absencePanel() {
  return {
    embeds: [embed(
      '🌴 NYTHERA ABMELDUNG',
      [
        '**Kurz abmelden:** bis zu 7 Tage',
        '**Lang abmelden:** länger als 7 Tage',
        '**Wieder eintreten:** beendet deine aktive Abmeldung',
        '',
        'Während einer aktiven Abmeldung kannst du dich nicht bei Events anmelden.'
      ].join('\n'),
      COLORS.purple
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('absence:short').setLabel('Kurz abmelden').setEmoji('⏱️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('absence:long').setLabel('Lang abmelden').setEmoji('🗓️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('absence:return').setLabel('Wieder eintreten').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('absence:status').setLabel('Mein Status').setEmoji('👤').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function eventPanel(event, runId, participants = [], scheduledStart = null) {
  const list = participants.length
    ? participants.slice(0, 20).map(x => `• <@${x.discord_id}>`).join('\n')
    : 'Keine';
  const eventTime = scheduledStart
    ? `<t:${Math.floor(new Date(scheduledStart).getTime() / 1000)}:R>`
    : 'manuell';

  return {
    embeds: [embed(
      `📅 Anmeldung – ${event.name}`,
      [
        `👥 **Teilnehmer:** ${participants.length}/${event.participant_limit || 25}`,
        `🚙 **Anfahrt:** ${Number(event.travel_payout || 0).toLocaleString('de-DE')} $`,
        `💵 **Gewinn:** ${Number(event.win_payout || 0).toLocaleString('de-DE')} $`,
        `⏰ **Eventstart:** ${eventTime}`,
        '',
        '**Teilnehmer**',
        list
      ].join('\n')
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`event:join:${runId}`).setLabel('Anmelden').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`event:leave:${runId}`).setLabel('Abmelden').setEmoji('❌').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`event:info:${runId}`).setLabel('Informationen').setEmoji('ℹ️').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function panelGuide() {
  return {
    embeds: [embed(
      '🧰 NYTHERA PANEL-SYSTEM',
      [
        '**Panel platzieren**',
        'Management nutzt `/panel` direkt in diesem Channel.',
        '',
        '**Reparieren**',
        'Nach jeder vollen Stunde wird eine Reparatur fällig. Der Besitzer erhält privat eine Erinnerung.',
        '',
        '**Einsammeln**',
        'Nach vier Stunden wird das Panel zum Einsammeln freigegeben.'
      ].join('\n')
    )]
  };
}

export function payoutGuide() {
  return {
    embeds: [embed(
      '💰 NYTHERA AUSZAHLUNGEN',
      [
        'Die offene Auszahlungsliste wird automatisch aktualisiert.',
        '',
        'Mitglieder können ihre eigene Auszahlung ansehen.',
        'Bezahlte Beträge verschwinden aus der offenen Liste und bleiben in der Historie.'
      ].join('\n')
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('payout:mine').setLabel('Meine Auszahlung').setEmoji('💰').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('payout:refresh').setLabel('Aktualisieren').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function killTicketGuide() {
  return {
    embeds: [embed(
      '⚔️ NYTHERA KILL-TICKETS',
      [
        'Nicht automatisch erkannte Kills können hier eingereicht werden.',
        '',
        '1. Klicke auf **Kill einreichen**',
        '2. Trage Event, Gegner und Waffe ein',
        '3. Lade danach den Screenshot im Ticket hoch',
        '4. Management prüft den Nachweis'
      ].join('\n')
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('killticket:start').setLabel('Kill einreichen').setEmoji('⚔️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('killticket:mine').setLabel('Meine Tickets').setEmoji('📂').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function liveCenter() {
  return {
    embeds: [embed(
      '📡 NYTHERA LIVE CENTER',
      'Nutze die Buttons für Events, Panels, Auszahlungen, Abmeldung und Profil.'
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('live:events').setLabel('Events').setEmoji('📅').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('live:panels').setLabel('Panels').setEmoji('🧰').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('live:payout').setLabel('Auszahlung').setEmoji('💰').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('live:absence').setLabel('Abmeldung').setEmoji('🌴').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('live:profile').setLabel('Profil').setEmoji('👤').setStyle(ButtonStyle.Secondary)
    )]
  };
}

export function panelCard(panel) {
  const remain = Math.max(0, new Date(panel.ends_at).getTime() - Date.now());
  const hours = String(Math.floor(remain / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((remain % 3600000) / 60000)).padStart(2, '0');
  return {
    embeds: [embed(
      `🧰 Panel ${panel.panel_number} – ${panel.location || 'Ohne Standort'}`,
      [
        `👤 **Besitzer:** ${panel.owner_name || 'Unbekannt'}`,
        `🎮 **Ingame-ID:** ${panel.owner_ingame_id || '—'}`,
        `⏳ **Restzeit:** ${hours}:${minutes}`,
        `🔧 **Reparaturen:** ${panel.repairs_done || 0}/4`,
        `📦 **Status:** ${panel.status}`
      ].join('\n')
    )],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`panel:repair:${panel.id}`).setLabel('Repariert').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`panel:remind:${panel.id}`).setLabel('Erinnern').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`panel:collect:${panel.id}`).setLabel('Einsammeln').setEmoji('📦').setStyle(ButtonStyle.Danger)
    )]
  };
}


export function bloodInGuide() {
  return {
    embeds: [embed(
      '🩸 NYTHERA BLOOD-IN',
      [
        'Hier werden neu aufgenommene Familienmitglieder dokumentiert.',
        '',
        'Recruiter nutzen `/bloodin` und tragen ein:',
        '• Vorname',
        '• Nachname',
        '• Ingame-ID',
        '• optional Discord-Mitglied',
        '',
        'Datum, Uhrzeit und Recruiter werden automatisch gespeichert.'
      ].join('\n'),
      COLORS.success
    )]
  };
}

export function bloodOutGuide() {
  return {
    embeds: [embed(
      '💀 NYTHERA BLOOD-OUT',
      [
        'Hier werden ausgetretene oder entfernte Mitglieder dokumentiert.',
        '',
        'Recruiter oder Management nutzen `/bloodout` und tragen ein:',
        '• Vorname',
        '• Nachname',
        '• Ingame-ID',
        '• Grund',
        '',
        'Datum, Uhrzeit und bearbeitende Person werden automatisch gespeichert.'
      ].join('\n'),
      COLORS.danger
    )]
  };
}

export function companyGuide() {
  return {
    embeds: [embed(
      '🏢 NYTHERA UNTERNEHMEN',
      [
        'Hier werden Familien-Unternehmen gespeichert.',
        '',
        'Nutze `/unternehmen` und trage ein:',
        '• Name des Unternehmens',
        '• Standort',
        '• optional Besitzer',
        '• optionale Notiz'
      ].join('\n'),
      COLORS.purple
    )]
  };
}
