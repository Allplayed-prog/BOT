import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { DateTime } from 'luxon';
import { config } from './config.js';
import { db, must, getSetting, setSetting } from './db.js';
import {
  embed,
  registrationPanel,
  absencePanel,
  eventPanel,
  panelGuide,
  payoutGuide,
  killTicketGuide,
  liveCenter,
  panelCard,
  bloodInGuide,
  bloodOutGuide,
  companyGuide
} from './ui.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const setupChoices = [
  { name: 'Registrierung', value: 'registration' },
  { name: 'Registrierungs-Prüfung speichern', value: 'review' },
  { name: 'Abmeldung', value: 'absence' },
  { name: 'Events', value: 'events' },
  { name: 'Panels', value: 'panels' },
  { name: 'Auszahlungen', value: 'payouts' },
  { name: 'Kill-Tickets', value: 'killtickets' },
  { name: 'Live-Center', value: 'live' },
  { name: 'Blood-IN', value: 'bloodin' },
  { name: 'Blood-OUT', value: 'bloodout' },
  { name: 'Unternehmen', value: 'companies' }
];

const commands = [
  new SlashCommandBuilder().setName('register').setDescription('Registrierung öffnen'),
  new SlashCommandBuilder().setName('abmelden').setDescription('Kurz oder lang abmelden'),
  new SlashCommandBuilder().setName('eintreten').setDescription('Aktive Abmeldung beenden'),
  new SlashCommandBuilder().setName('me').setDescription('Eigenes Profil anzeigen'),
  new SlashCommandBuilder().setName('events').setDescription('Offene Events anzeigen'),
  new SlashCommandBuilder().setName('panels').setDescription('Aktive Panels anzeigen'),
  new SlashCommandBuilder().setName('payout').setDescription('Eigene Auszahlung anzeigen'),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('UI im aktuellen Channel erstellen')
    .addStringOption(o => o.setName('typ').setDescription('Welche UI?').setRequired(true).addChoices(...setupChoices))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('safety')
    .setDescription('Systemprüfung')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('event')
    .setDescription('Event-Anmeldung manuell öffnen')
    .addStringOption(o => o.setName('name').setDescription('Event').setRequired(true).setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  new SlashCommandBuilder()
    .setName('eventtest')
    .setDescription('Testet sofort eine Event-Nachricht im Event-Channel')
    .addStringOption(o => o.setName('name').setDescription('Event').setRequired(true).setAutocomplete(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Panel platzieren')
    .addIntegerOption(o => o.setName('nummer').setDescription('Panelnummer').setRequired(true))
    .addUserOption(o => o.setName('besitzer').setDescription('Besitzer').setRequired(true))
    .addStringOption(o => o.setName('standort').setDescription('Standort').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  new SlashCommandBuilder()
    .setName('bloodin')
    .setDescription('Neues Familienmitglied dokumentieren')
    .addStringOption(o => o.setName('vorname').setDescription('Vorname').setRequired(true))
    .addStringOption(o => o.setName('nachname').setDescription('Nachname').setRequired(true))
    .addStringOption(o => o.setName('id').setDescription('Ingame-ID').setRequired(true))
    .addUserOption(o => o.setName('mitglied').setDescription('Discord-Mitglied').setRequired(false))
    .addStringOption(o => o.setName('notiz').setDescription('Optionale Notiz').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('bloodout')
    .setDescription('Austritt oder Rauswurf dokumentieren')
    .addStringOption(o => o.setName('vorname').setDescription('Vorname').setRequired(true))
    .addStringOption(o => o.setName('nachname').setDescription('Nachname').setRequired(true))
    .addStringOption(o => o.setName('id').setDescription('Ingame-ID').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(true))
    .addUserOption(o => o.setName('mitglied').setDescription('Discord-Mitglied').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('unternehmen')
    .setDescription('Unternehmen speichern')
    .addStringOption(o => o.setName('name').setDescription('Unternehmensname').setRequired(true))
    .addStringOption(o => o.setName('standort').setDescription('Standort').setRequired(true))
    .addUserOption(o => o.setName('besitzer').setDescription('Besitzer').setRequired(false))
    .addStringOption(o => o.setName('notiz').setDescription('Optionale Notiz').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
].map(x => x.toJSON());

function isStaff(member) {
  const ids = [config.roles.owner, config.roles.management, config.roles.moderator].filter(Boolean);
  return member?.roles?.cache?.some(role => ids.includes(role.id));
}

async function registration(discordId, approved = false) {
  let query = db.from('registrations').select('*').eq('discord_id', discordId);
  if (approved) query = query.eq('status', 'approved');
  return (await must(query.maybeSingle(), 'Registrierung prüfen')).data;
}

async function activeAbsence(discordId) {
  const now = new Date().toISOString();
  const { data } = await must(
    db.from('absences')
      .select('*')
      .eq('discord_id', discordId)
      .eq('status', 'active')
      .lte('start_at', now)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'Abmeldung prüfen'
  );
  return data;
}

function registrationModal() {
  const modal = new ModalBuilder().setCustomId('register:modal').setTitle('Nythera Registrierung');
  const fields = [
    new TextInputBuilder().setCustomId('ingame_id').setLabel('Ingame-ID').setStyle(TextInputStyle.Short).setRequired(true),
    new TextInputBuilder().setCustomId('first_name').setLabel('Vorname').setStyle(TextInputStyle.Short).setRequired(true),
    new TextInputBuilder().setCustomId('last_name').setLabel('Nachname').setStyle(TextInputStyle.Short).setRequired(true)
  ];
  modal.addComponents(...fields.map(field => new ActionRowBuilder().addComponents(field)));
  return modal;
}


function killTicketModal() {
  const modal = new ModalBuilder().setCustomId('killticket:modal').setTitle('Kill-Ticket einreichen');
  const eventName = new TextInputBuilder().setCustomId('event_name').setLabel('Event').setStyle(TextInputStyle.Short).setRequired(true);
  const victim = new TextInputBuilder().setCustomId('victim_ref').setLabel('Gegner / Opfer').setStyle(TextInputStyle.Short).setRequired(true);
  const weapon = new TextInputBuilder().setCustomId('weapon').setLabel('Waffe').setStyle(TextInputStyle.Short).setRequired(true);
  const evidence = new TextInputBuilder().setCustomId('evidence_url').setLabel('Screenshot-Link / Beweis-Link').setStyle(TextInputStyle.Short).setRequired(true);
  const note = new TextInputBuilder().setCustomId('note').setLabel('Notiz').setStyle(TextInputStyle.Paragraph).setRequired(false);
  modal.addComponents(
    new ActionRowBuilder().addComponents(eventName),
    new ActionRowBuilder().addComponents(victim),
    new ActionRowBuilder().addComponents(weapon),
    new ActionRowBuilder().addComponents(evidence),
    new ActionRowBuilder().addComponents(note)
  );
  return modal;
}

function absenceModal(type) {
  const modal = new ModalBuilder().setCustomId(`absence:modal:${type}`).setTitle(type === 'short' ? 'Kurz abmelden' : 'Lang abmelden');
  const reason = new TextInputBuilder().setCustomId('reason').setLabel('Grund').setStyle(TextInputStyle.Paragraph).setRequired(true);
  const until = new TextInputBuilder()
    .setCustomId('until')
    .setLabel('Bis wann? YYYY-MM-DD')
    .setPlaceholder(type === 'short' ? '2026-07-20' : '2026-08-15')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(reason), new ActionRowBuilder().addComponents(until));
  return modal;
}

async function refreshEventMessage(guild, runId) {
  const { data: run } = await must(
    db.from('event_runs').select('*,event_templates(*)').eq('id', runId).single(),
    'Event laden'
  );
  const { data: participants = [] } = await must(
    db.from('event_participants').select('*').eq('run_id', runId),
    'Teilnehmer laden'
  );
  if (!run.discord_channel_id || !run.discord_message_id) return;
  const channel = await guild.channels.fetch(run.discord_channel_id);
  const message = await channel.messages.fetch(run.discord_message_id);
  await message.edit(eventPanel(run.event_templates, run.id, participants, run.scheduled_start));
}

async function openScheduledEvent(guild, template, scheduledStart) {
  const lockKey = `event:${template.id}:${scheduledStart.toISO()}`;
  const { data: existing } = await must(
    db.from('automation_locks').select('lock_key').eq('lock_key', lockKey).maybeSingle(),
    'Event-Lock prüfen'
  );
  if (existing) return;

  const channelId = template.discord_channel_id || await getSetting('event_channel_id');
  if (!channelId) return;

  await must(db.from('automation_locks').insert({ lock_key: lockKey }), 'Event-Lock setzen');
  const { data: run } = await must(
    db.from('event_runs').insert({
      template_id: template.id,
      status: 'registration_open',
      trigger: 'automatic',
      scheduled_start: scheduledStart.toUTC().toISO(),
      discord_channel_id: String(channelId)
    }).select().single(),
    'Event-Run anlegen'
  );
  const channel = await guild.channels.fetch(String(channelId));
  const message = await channel.send(eventPanel(template, run.id, [], run.scheduled_start));
  await must(
    db.from('event_runs').update({ discord_message_id: message.id }).eq('id', run.id),
    'Event-Nachricht speichern'
  );
}

async function runEventScheduler(guild) {
  const now = DateTime.now().setZone(config.timezone).startOf('minute');
  const { data: templates = [] } = await must(
    db.from('event_templates').select('*').eq('active', true).eq('automatic', true),
    'Eventvorlagen laden'
  );

  for (const template of templates) {
    for (const startTime of template.start_times || []) {
      const [hour, minute] = String(startTime).split(':').map(Number);
      const eventStart = now.set({ hour, minute, second: 0, millisecond: 0 });
      const registrationOpen = eventStart.minus({ minutes: Number(template.registration_minutes || 25) });
      const diffMinutes = now.diff(registrationOpen, 'minutes').minutes;
      if (diffMinutes >= 0 && diffMinutes < 2) {
        await openScheduledEvent(guild, template, eventStart);
      }
    }
  }

  const { data: openRuns = [] } = await must(
    db.from('event_runs').select('*').eq('status', 'registration_open').not('scheduled_start', 'is', null),
    'Offene Events laden'
  );
  for (const run of openRuns) {
    if (DateTime.fromISO(run.scheduled_start).toMillis() <= DateTime.utc().toMillis()) {
      await must(db.from('event_runs').update({ status: 'closed' }).eq('id', run.id), 'Event schließen');
      await refreshEventMessage(guild, run.id).catch(() => {});
    }
  }
}

async function runPanelScheduler(guild) {
  const { data: panels = [] } = await must(
    db.from('panels').select('*').in('status', ['active', 'repair_due', 'ready']),
    'Panels laden'
  );

  for (const panel of panels) {
    const started = DateTime.fromISO(panel.started_at);
    const elapsedHours = Math.floor(DateTime.utc().diff(started.toUTC(), 'hours').hours);
    const owner = await guild.members.fetch(panel.owner_discord_id).catch(() => null);

    if (elapsedHours >= 4 && panel.status !== 'ready') {
      await must(db.from('panels').update({ status: 'ready' }).eq('id', panel.id), 'Panel bereitsetzen');
      if (owner) await owner.send({ embeds: [embed('📦 Panel bereit zum Einsammeln', `Panel ${panel.panel_number} kann jetzt eingesammelt werden.`)] }).catch(() => {});
    }

    for (const hour of [1, 2, 3]) {
      if (elapsedHours < hour) continue;
      const key = `panel:${panel.id}:repair:${hour}`;
      const { data: sent } = await must(db.from('panel_notifications').select('notification_key').eq('notification_key', key).maybeSingle());
      if (sent) continue;
      await must(db.from('panel_notifications').insert({ panel_id: panel.id, notification_key: key, notification_type: 'repair_due' }));
      await must(db.from('panels').update({ status: 'repair_due' }).eq('id', panel.id));
      if (owner) {
        await owner.send({ embeds: [embed(
          '🔧 Panel-Reparatur fällig',
          `Panel **${panel.panel_number}** (${panel.location || 'ohne Standort'}) benötigt die Reparatur für Stunde ${hour}.`
        )] }).catch(() => {});
      }
    }
  }
}

async function safety(guild) {
  const lines = [];
  async function check(label, fn) {
    try { await fn(); lines.push(`✅ ${label}`); }
    catch (error) { lines.push(`❌ ${label}: ${error.message}`); }
  }
  for (const table of [
    'registrations','absences','event_templates','event_runs','event_participants',
    'panels','panel_repairs','panel_notifications','payouts','warnings',
    'member_actions','kill_logs','kill_tickets','system_settings','automation_locks',
    'blood_in','blood_out','companies','channel_setup_log'
  ]) {
    await check(`Tabelle ${table}`, () => must(db.from(table).select('*').limit(1)));
  }
  if (!config.roles.member) lines.push('⚠️ MEMBER_ROLE_ID fehlt');
  else await check('Mitgliederrolle', () => guild.roles.fetch(config.roles.member));
  return lines;
}

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} online`);
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });

  const guild = await client.guilds.fetch(config.guildId);
  await runEventScheduler(guild).catch(console.error);
  await runPanelScheduler(guild).catch(console.error);

  setInterval(() => runEventScheduler(guild).catch(console.error), 60_000);
  setInterval(() => runPanelScheduler(guild).catch(console.error), 60_000);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isAutocomplete()) {
      const { data = [] } = await must(db.from('event_templates').select('name').order('name'));
      return interaction.respond(data.slice(0, 25).map(row => ({ name: row.name, value: row.name })));
    }

    if (interaction.isModalSubmit() && interaction.customId === 'register:modal') {
      const payload = {
        discord_id: interaction.user.id,
        discord_user_id: interaction.user.id,
        ingame_id: interaction.fields.getTextInputValue('ingame_id').trim(),
        first_name: interaction.fields.getTextInputValue('first_name').trim(),
        last_name: interaction.fields.getTextInputValue('last_name').trim(),
        status: 'pending'
      };

      const { data: existing } = await must(
        db.from('registrations').select('*').eq('discord_id', interaction.user.id).maybeSingle(),
        'Registrierung suchen'
      );

      let data;
      if (existing) {
        ({ data } = await must(
          db.from('registrations')
            .update({ ...payload, approved_at: null, approved_by: null })
            .eq('id', existing.id)
            .select()
            .single(),
          'Registrierung aktualisieren'
        ));
      } else {
        ({ data } = await must(
          db.from('registrations').insert(payload).select().single(),
          'Registrierung anlegen'
        ));
      }

      const reviewChannelId = await getSetting('registration_review_channel_id');
      if (!reviewChannelId) throw new Error('Review-Channel fehlt. Führe im Review-Channel `/setup typ: Registrierungs-Prüfung speichern` aus.');
      const review = await interaction.guild.channels.fetch(String(reviewChannelId));
      await review.send({
        embeds: [embed(
          '📝 Neue Registrierung',
          `Discord: ${interaction.user}\nIngame-ID: **${data.ingame_id}**\nName: **${data.first_name} ${data.last_name}**`
        )],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`review:approve:${data.id}`).setLabel('Annehmen').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`review:reject:${data.id}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger)
        )]
      });
      return interaction.reply({ ephemeral: true, content: '✅ Registrierung eingereicht.' });
    }


    if (interaction.isModalSubmit() && interaction.customId === 'killticket:modal') {
      await interaction.deferReply({ ephemeral: true });

      const reg = await registration(interaction.user.id, true);
      if (!reg) return interaction.editReply({ content: '❌ Du bist noch nicht freigeschaltet.' });

      const payload = {
        discord_id: interaction.user.id,
        registration_id: String(reg.id),
        event_name: interaction.fields.getTextInputValue('event_name').trim(),
        victim_ref: interaction.fields.getTextInputValue('victim_ref').trim(),
        weapon: interaction.fields.getTextInputValue('weapon').trim(),
        evidence_url: interaction.fields.getTextInputValue('evidence_url').trim(),
        note: interaction.fields.getTextInputValue('note')?.trim() || null,
        status: 'open'
      };

      const { data: ticket } = await must(
        db.from('kill_tickets').insert(payload).select().single(),
        'Kill-Ticket speichern'
      );

      const channelId = await getSetting('kill_ticket_channel_id') || interaction.channelId;
      const channel = await interaction.guild.channels.fetch(String(channelId));
      await channel.send({
        embeds: [embed(
          `⚔️ Kill-Ticket #${ticket.id}`,
          [
            `👤 **Mitglied:** <@${interaction.user.id}>`,
            `📅 **Event:** ${ticket.event_name}`,
            `🎯 **Gegner:** ${ticket.victim_ref}`,
            `🔫 **Waffe:** ${ticket.weapon}`,
            `🖼️ **Beweis:** ${ticket.evidence_url}`,
            ticket.note ? `📝 **Notiz:** ${ticket.note}` : ''
          ].filter(Boolean).join('\\n')
        )],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`killreview:approve:${ticket.id}`).setLabel('Annehmen').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`killreview:reject:${ticket.id}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger)
        )]
      });

      return interaction.editReply({ content: '✅ Kill-Ticket wurde eingereicht.' });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('absence:modal:')) {
      const type = interaction.customId.split(':')[2];
      const reason = interaction.fields.getTextInputValue('reason').trim();
      const untilRaw = interaction.fields.getTextInputValue('until').trim();
      const end = DateTime.fromISO(untilRaw, { zone: config.timezone }).endOf('day');
      if (!end.isValid || end.toMillis() <= DateTime.now().setZone(config.timezone).toMillis()) {
        return interaction.reply({ ephemeral: true, content: '❌ Bitte ein zukünftiges Datum im Format YYYY-MM-DD eingeben.' });
      }
      const maxDays = type === 'short' ? 7 : 365;
      const days = Math.ceil(end.diff(DateTime.now().setZone(config.timezone), 'days').days);
      if (type === 'short' && days > maxDays) {
        return interaction.reply({ ephemeral: true, content: '❌ Eine kurze Abmeldung darf höchstens 7 Tage dauern. Nutze „Lang abmelden“.' });
      }
      await must(
        db.from('absences').update({ status: 'returned', returned_at: new Date().toISOString() })
          .eq('discord_id', interaction.user.id).eq('status', 'active'),
        'Alte Abmeldung schließen'
      );
      await must(
        db.from('absences').insert({
          discord_id: interaction.user.id,
          absence_type: type,
          reason,
          start_at: new Date().toISOString(),
          end_at: end.toUTC().toISO(),
          status: 'active'
        }),
        'Abmeldung speichern'
      );
      return interaction.reply({ ephemeral: true, embeds: [embed(
        '🌴 Abmeldung gespeichert',
        `Typ: **${type === 'short' ? 'Kurz' : 'Lang'}**\nBis: **${end.toFormat('dd.MM.yyyy')}**\n\nWährenddessen ist die Event-Anmeldung gesperrt.`
      )] });
    }

    if (interaction.isButton() && interaction.customId.startsWith('review:')) {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const [, action, id] = interaction.customId.split(':');
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { data: reg } = await must(
        db.from('registrations')
          .update({ status, approved_at: new Date().toISOString(), approved_by: interaction.user.id })
          .eq('id', id)
          .select()
          .single(),
        'Registrierung bearbeiten'
      );

      let roleText = 'Nicht vergeben';
      let nicknameText = 'Nicht geändert';
      if (status === 'approved') {
        const member = await interaction.guild.members.fetch(reg.discord_id);
        if (config.roles.member) {
          await member.roles.add(config.roles.member, 'Nythera Registrierung angenommen');
          roleText = 'Mitgliederrolle vergeben';
        }
        const nickname = `${reg.first_name} ${reg.last_name} | ${reg.ingame_id}`.slice(0, 32);
        if (member.manageable && member.id !== interaction.guild.ownerId) {
          await member.setNickname(nickname, 'Nythera Registrierung angenommen').catch(() => {});
          nicknameText = nickname;
        }
        await member.send({ embeds: [embed('✅ Registrierung angenommen', `Du bist jetzt freigeschaltet.\nNickname: **${nickname}**`)] }).catch(() => {});
      }

      return interaction.update({
        embeds: [embed(
          status === 'approved' ? '✅ Registrierung angenommen' : '❌ Registrierung abgelehnt',
          `${reg.first_name} ${reg.last_name} · ${reg.ingame_id}\n\n**Rolle:** ${roleText}\n**Nickname:** ${nicknameText}`
        )],
        components: []
      });
    }

    if (interaction.isButton() && interaction.customId === 'killticket:start') {
      return interaction.showModal(killTicketModal());
    }

    if (interaction.isButton() && interaction.customId === 'killticket:mine') {
      await interaction.deferReply({ ephemeral: true });
      const { data = [] } = await must(
        db.from('kill_tickets').select('*').eq('discord_id', interaction.user.id).order('created_at', { ascending: false }).limit(10),
        'Kill-Tickets laden'
      );
      const body = data.length
        ? data.map(t => `#${t.id} · ${t.event_name || 'Event'} · ${t.status}`).join('\\n')
        : 'Keine Kill-Tickets vorhanden.';
      return interaction.editReply({ embeds: [embed('📂 Meine Kill-Tickets', body)] });
    }

    if (interaction.isButton() && interaction.customId.startsWith('killreview:')) {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      await interaction.deferUpdate();
      const [, action, id] = interaction.customId.split(':');
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { data: ticket } = await must(
        db.from('kill_tickets')
          .update({ status, reviewed_by: interaction.user.id, reviewed_at: new Date().toISOString() })
          .eq('id', Number(id))
          .select()
          .single(),
        'Kill-Ticket bearbeiten'
      );
      return interaction.editReply({
        embeds: [embed(
          status === 'approved' ? `✅ Kill-Ticket #${ticket.id} angenommen` : `❌ Kill-Ticket #${ticket.id} abgelehnt`,
          `Event: **${ticket.event_name || '—'}**\\nMitglied: <@${ticket.discord_id}>\\nBearbeitet von: <@${interaction.user.id}>`
        )],
        components: []
      });
    }

    if (interaction.isButton()) {
      const [area, action, id] = interaction.customId.split(':');

      if (area === 'register' && action === 'start') return interaction.showModal(registrationModal());
      if (area === 'register' && action === 'status') {
        const reg = await registration(interaction.user.id);
        return interaction.reply({ ephemeral: true, content: reg ? `Status: **${reg.status}**` : 'Noch keine Registrierung.' });
      }

      if (area === 'absence' && ['short', 'long'].includes(action)) return interaction.showModal(absenceModal(action));
      if (area === 'absence' && action === 'return') {
        await must(
          db.from('absences').update({ status: 'returned', returned_at: new Date().toISOString() })
            .eq('discord_id', interaction.user.id).eq('status', 'active'),
          'Abmeldung beenden'
        );
        return interaction.reply({ ephemeral: true, content: '✅ Du bist wieder eingetreten und kannst dich bei Events anmelden.' });
      }
      if (area === 'absence' && action === 'status') {
        const absence = await activeAbsence(interaction.user.id);
        return interaction.reply({
          ephemeral: true,
          content: absence
            ? `Aktiv bis **${DateTime.fromISO(absence.end_at).setZone(config.timezone).toFormat('dd.MM.yyyy')}** – ${absence.reason}`
            : 'Du bist aktuell nicht abgemeldet.'
        });
      }

      if (area === 'event' && ['join', 'leave'].includes(action)) {
        const reg = await registration(interaction.user.id, true);
        if (!reg) return interaction.reply({ ephemeral: true, content: '❌ Du bist noch nicht freigeschaltet.' });

        const absence = await activeAbsence(interaction.user.id);
        if (absence && action === 'join') {
          return interaction.reply({
            ephemeral: true,
            content: `🌴 Du bist bis ${DateTime.fromISO(absence.end_at).setZone(config.timezone).toFormat('dd.MM.yyyy')} abgemeldet und kannst dich nicht anmelden.`
          });
        }

        const runId = Number(id);
        if (action === 'join') {
          await must(
            db.from('event_participants').upsert(
              { run_id: runId, discord_id: interaction.user.id, registration_id: String(reg.id) },
              { onConflict: 'run_id,discord_id' }
            ),
            'Event-Anmeldung'
          );
        } else {
          await must(
            db.from('event_participants').delete().eq('run_id', runId).eq('discord_id', interaction.user.id),
            'Event-Abmeldung'
          );
        }
        await refreshEventMessage(interaction.guild, runId);
        return interaction.reply({ ephemeral: true, content: action === 'join' ? '✅ Angemeldet.' : '✅ Abgemeldet.' });
      }

      if (area === 'payout' && action === 'mine') {
        const { data = [] } = await must(
          db.from('payouts').select('amount').eq('discord_id', interaction.user.id).eq('status', 'open')
        );
        const total = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return interaction.reply({ ephemeral: true, embeds: [embed('💰 Meine Auszahlung', `Offen: **${total.toLocaleString('de-DE')} $**`)] });
      }

      if (area === 'live') {
        if (action === 'events') return interaction.reply({ ephemeral: true, content: 'Nutze `/events` für offene Events.' });
        if (action === 'panels') return interaction.reply({ ephemeral: true, content: 'Nutze `/panels` für aktive Panels.' });
        if (action === 'payout') return interaction.reply({ ephemeral: true, content: 'Nutze `/payout` für deine Auszahlung.' });
        if (action === 'absence') return interaction.reply({ ephemeral: true, ...absencePanel() });
        if (action === 'profile') return interaction.reply({ ephemeral: true, content: 'Nutze `/me` für dein Profil.' });
      }

      if (area === 'panel' && action === 'repair') {
        const { data: panel } = await must(db.from('panels').select('*').eq('id', id).single());
        if (panel.owner_discord_id !== interaction.user.id && !isStaff(interaction.member)) {
          return interaction.reply({ ephemeral: true, content: '❌ Nur Besitzer oder Management.' });
        }
        const hour = Math.min(4, Math.max(1, Math.ceil((Date.now() - new Date(panel.started_at).getTime()) / 3600000)));
        await must(
          db.from('panel_repairs').upsert(
            { panel_id: panel.id, hour_number: hour, repaired_by: interaction.user.id },
            { onConflict: 'panel_id,hour_number' }
          ),
          'Reparatur speichern'
        );
        const { data: updated } = await must(
          db.from('panels').update({ repairs_done: Math.max(panel.repairs_done || 0, hour), status: 'active' }).eq('id', panel.id).select().single()
        );
        return interaction.update(panelCard(updated));
      }

      if (area === 'panel' && action === 'collect') {
        const { data: panel } = await must(db.from('panels').select('*').eq('id', id).single());
        if (panel.owner_discord_id !== interaction.user.id && !isStaff(interaction.member)) {
          return interaction.reply({ ephemeral: true, content: '❌ Nur Besitzer oder Management.' });
        }
        if (Date.now() < new Date(panel.ends_at).getTime()) {
          return interaction.reply({ ephemeral: true, content: '⏳ Das Panel ist noch nicht vier Stunden alt.' });
        }
        const { data: updated } = await must(
          db.from('panels').update({
            status: 'collected',
            collected_at: new Date().toISOString(),
            collected_by: interaction.user.id
          }).eq('id', panel.id).select().single()
        );
        return interaction.update({ ...panelCard(updated), components: [] });
      }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') return interaction.showModal(registrationModal());
    if (interaction.commandName === 'abmelden') return interaction.reply({ ephemeral: true, ...absencePanel() });
    if (interaction.commandName === 'eintreten') {
      await must(
        db.from('absences').update({ status: 'returned', returned_at: new Date().toISOString() })
          .eq('discord_id', interaction.user.id).eq('status', 'active'),
        'Abmeldung beenden'
      );
      return interaction.reply({ ephemeral: true, content: '✅ Du bist wieder eingetreten.' });
    }

    if (interaction.commandName === 'setup') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      await interaction.deferReply({ ephemeral: true });
      const type = interaction.options.getString('typ', true);
      const channelId = interaction.channelId;

      if (type === 'registration') {
        await setSetting('registration_channel_id', channelId);
        await interaction.channel.send(registrationPanel());
      } else if (type === 'review') {
        await setSetting('registration_review_channel_id', channelId);
      } else if (type === 'absence') {
        await setSetting('absence_channel_id', channelId);
        await interaction.channel.send(absencePanel());
      } else if (type === 'events') {
        await setSetting('event_channel_id', channelId);
        await interaction.channel.send({ embeds: [embed('📅 NYTHERA EVENTS', 'Automatische und manuelle Event-Anmeldungen erscheinen in diesem Channel.')] });
      } else if (type === 'panels') {
        await setSetting('panel_channel_id', channelId);
        await interaction.channel.send(panelGuide());
      } else if (type === 'payouts') {
        await setSetting('payout_channel_id', channelId);
        await interaction.channel.send(payoutGuide());
      } else if (type === 'killtickets') {
        await setSetting('kill_ticket_channel_id', channelId);
        await interaction.channel.send(killTicketGuide());
      } else if (type === 'live') {
        await setSetting('live_channel_id', channelId);
        await interaction.channel.send(liveCenter());
      } else if (type === 'bloodin') {
        await setSetting('blood_in_channel_id', channelId);
        await interaction.channel.send(bloodInGuide());
      } else if (type === 'bloodout') {
        await setSetting('blood_out_channel_id', channelId);
        await interaction.channel.send(bloodOutGuide());
      } else if (type === 'companies') {
        await setSetting('company_channel_id', channelId);
        await interaction.channel.send(companyGuide());
      }

      await must(
        db.from('channel_setup_log').insert({
          setup_type: type,
          channel_id: channelId,
          configured_by: interaction.user.id
        }),
        'Setup protokollieren'
      );

      return interaction.editReply({ content: `✅ ${type} wurde für diesen Channel eingerichtet.` });
    }

    if (interaction.commandName === 'safety') {
      return interaction.reply({ ephemeral: true, embeds: [embed('🛡 Safety Check', (await safety(interaction.guild)).join('\n'))] });
    }

    if (interaction.commandName === 'event') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const name = interaction.options.getString('name', true);
      const { data: template } = await must(db.from('event_templates').select('*').eq('name', name).single());
      const channelId = template.discord_channel_id || await getSetting('event_channel_id') || interaction.channelId;
      const { data: run } = await must(
        db.from('event_runs').insert({
          template_id: template.id,
          status: 'registration_open',
          trigger: 'manual',
          discord_channel_id: String(channelId)
        }).select().single()
      );
      const channel = await interaction.guild.channels.fetch(String(channelId));
      const message = await channel.send(eventPanel(template, run.id, [], null));
      await must(db.from('event_runs').update({ discord_message_id: message.id }).eq('id', run.id));
      return interaction.reply({ ephemeral: true, content: `✅ ${name} geöffnet.` });
    }

    if (interaction.commandName === 'eventtest') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      await interaction.deferReply({ ephemeral: true });
      const name = interaction.options.getString('name', true);
      const { data: template } = await must(db.from('event_templates').select('*').eq('name', name).single(), 'Event laden');
      const channelId = template.discord_channel_id || await getSetting('event_channel_id');
      if (!channelId) return interaction.editReply({ content: '❌ Event-Channel fehlt. Im Event-Channel `/setup typ: Events` ausführen.' });
      const start = DateTime.now().setZone(config.timezone).plus({ minutes: 10 }).startOf('minute');
      await openScheduledEvent(interaction.guild, template, start);
      return interaction.editReply({ content: `✅ Test-Event ${name} wurde gesendet.` });
    }

    if (interaction.commandName === 'panel') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const number = interaction.options.getInteger('nummer', true);
      const owner = interaction.options.getUser('besitzer', true);
      const location = interaction.options.getString('standort', true);
      const reg = await registration(owner.id, true);
      if (!reg) return interaction.reply({ ephemeral: true, content: '❌ Besitzer ist nicht freigeschaltet.' });

      const channelId = await getSetting('panel_channel_id') || interaction.channelId;
      const { data: panel } = await must(
        db.from('panels').insert({
          panel_number: number,
          assigned_discord_id: owner.id,
          owner_discord_id: owner.id,
          owner_name: `${reg.first_name} ${reg.last_name}`,
          owner_ingame_id: reg.ingame_id,
          location,
          status: 'active',
          channel_id: String(channelId),
          ends_at: DateTime.utc().plus({ hours: 4 }).toISO(),
          repairs_done: 0
        }).select().single(),
        'Panel anlegen'
      );
      const channel = await interaction.guild.channels.fetch(String(channelId));
      const message = await channel.send(panelCard(panel));
      await must(db.from('panels').update({ discord_message_id: message.id }).eq('id', panel.id));
      return interaction.reply({ ephemeral: true, content: '✅ Panel platziert.' });
    }

    if (interaction.commandName === 'bloodin') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const firstName = interaction.options.getString('vorname', true).trim();
      const lastName = interaction.options.getString('nachname', true).trim();
      const ingameId = interaction.options.getString('id', true).trim();
      const member = interaction.options.getUser('mitglied', false);
      const note = interaction.options.getString('notiz', false);

      const { data: row } = await must(
        db.from('blood_in').insert({
          first_name: firstName,
          last_name: lastName,
          ingame_id: ingameId,
          discord_id: member?.id || null,
          invited_by: interaction.user.id,
          note: note || null
        }).select().single(),
        'Blood-IN speichern'
      );

      const channelId = await getSetting('blood_in_channel_id') || interaction.channelId;
      const channel = await interaction.guild.channels.fetch(String(channelId));
      await channel.send({
        embeds: [embed(
          '🩸 BLOOD-IN',
          [
            `👤 **Name:** ${firstName} ${lastName}`,
            `🎮 **Ingame-ID:** ${ingameId}`,
            `💬 **Discord:** ${member ? `<@${member.id}>` : 'nicht angegeben'}`,
            `👮 **Aufgenommen von:** <@${interaction.user.id}>`,
            `🕐 **Zeitpunkt:** <t:${Math.floor(new Date(row.invited_at).getTime()/1000)}:F>`,
            note ? `📝 **Notiz:** ${note}` : ''
          ].filter(Boolean).join('\n')
        )]
      });
      return interaction.reply({ ephemeral: true, content: '✅ Blood-IN wurde gespeichert.' });
    }

    if (interaction.commandName === 'bloodout') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const firstName = interaction.options.getString('vorname', true).trim();
      const lastName = interaction.options.getString('nachname', true).trim();
      const ingameId = interaction.options.getString('id', true).trim();
      const reason = interaction.options.getString('grund', true).trim();
      const member = interaction.options.getUser('mitglied', false);

      const { data: row } = await must(
        db.from('blood_out').insert({
          first_name: firstName,
          last_name: lastName,
          ingame_id: ingameId,
          discord_id: member?.id || null,
          removed_by: interaction.user.id,
          reason
        }).select().single(),
        'Blood-OUT speichern'
      );

      const channelId = await getSetting('blood_out_channel_id') || interaction.channelId;
      const channel = await interaction.guild.channels.fetch(String(channelId));
      await channel.send({
        embeds: [embed(
          '💀 BLOOD-OUT',
          [
            `👤 **Name:** ${firstName} ${lastName}`,
            `🎮 **Ingame-ID:** ${ingameId}`,
            `💬 **Discord:** ${member ? `<@${member.id}>` : 'nicht angegeben'}`,
            `🚪 **Entfernt von:** <@${interaction.user.id}>`,
            `🕐 **Zeitpunkt:** <t:${Math.floor(new Date(row.removed_at).getTime()/1000)}:F>`,
            `📝 **Grund:** ${reason}`
          ].join('\n'),
          0xff5f74
        )]
      });
      return interaction.reply({ ephemeral: true, content: '✅ Blood-OUT wurde gespeichert.' });
    }

    if (interaction.commandName === 'unternehmen') {
      if (!isStaff(interaction.member)) return interaction.reply({ ephemeral: true, content: '❌ Keine Berechtigung.' });
      const name = interaction.options.getString('name', true).trim();
      const location = interaction.options.getString('standort', true).trim();
      const owner = interaction.options.getUser('besitzer', false);
      const note = interaction.options.getString('notiz', false);

      await must(
        db.from('companies').insert({
          name,
          location,
          owner_name: owner?.username || null,
          owner_discord_id: owner?.id || null,
          note: note || null,
          created_by: interaction.user.id
        }),
        'Unternehmen speichern'
      );

      const channelId = await getSetting('company_channel_id') || interaction.channelId;
      const channel = await interaction.guild.channels.fetch(String(channelId));
      await channel.send({
        embeds: [embed(
          '🏢 UNTERNEHMEN',
          [
            `🏷️ **Name:** ${name}`,
            `📍 **Standort:** ${location}`,
            `👤 **Besitzer:** ${owner ? `<@${owner.id}>` : 'nicht angegeben'}`,
            note ? `📝 **Notiz:** ${note}` : ''
          ].filter(Boolean).join('\n'),
          0x7a4dff
        )]
      });
      return interaction.reply({ ephemeral: true, content: '✅ Unternehmen wurde gespeichert.' });
    }

    if (interaction.commandName === 'me') {
      const reg = await registration(interaction.user.id);
      const absence = await activeAbsence(interaction.user.id);
      return interaction.reply({
        ephemeral: true,
        embeds: [embed(
          '👤 Mein Profil',
          reg
            ? `**${reg.first_name} ${reg.last_name}**\nIngame-ID: ${reg.ingame_id}\nStatus: ${reg.status}\nAbmeldung: ${absence ? 'aktiv' : 'nein'}`
            : 'Noch nicht registriert.'
        )]
      });
    }

    if (interaction.commandName === 'events') {
      const { data = [] } = await must(
        db.from('event_runs').select('*,event_templates(*)').eq('status', 'registration_open').order('created_at', { ascending: false })
      );
      return interaction.reply({
        ephemeral: true,
        embeds: [embed('📅 Offene Events', data.length ? data.map(x => `• ${x.event_templates?.name}`).join('\n') : 'Keine offenen Events.')]
      });
    }

    if (interaction.commandName === 'panels') {
      const { data = [] } = await must(
        db.from('panels').select('*').in('status', ['active', 'repair_due', 'ready']).order('created_at', { ascending: false })
      );
      return interaction.reply({
        ephemeral: true,
        embeds: [embed('🧰 Aktive Panels', data.length ? data.map(x => `• Panel ${x.panel_number} – ${x.owner_name || 'Unbekannt'} – ${x.status}`).join('\n') : 'Keine aktiven Panels.')]
      });
    }

    if (interaction.commandName === 'payout') {
      const { data = [] } = await must(
        db.from('payouts').select('amount').eq('discord_id', interaction.user.id).eq('status', 'open')
      );
      const total = data.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      return interaction.reply({ ephemeral: true, embeds: [embed('💰 Meine Auszahlung', `Offen: **${total.toLocaleString('de-DE')} $**`)] });
    }
  } catch (error) {
    console.error(error);
    const message = `❌ ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`;
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: message }).catch(() => {});
    } else if (interaction.replied) {
      await interaction.followUp({ ephemeral: true, content: message }).catch(() => {});
    } else {
      await interaction.reply({ ephemeral: true, content: message }).catch(() => {});
    }
  }
});

client.login(config.token);
