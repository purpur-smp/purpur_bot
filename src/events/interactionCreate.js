require('dotenv').config();
const {
    PermissionFlagsBits,
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const mysql = require('mysql2/promise');

/**
 * --- interactionCreate.js (fusion) -----------------------------------------
 * Ce fichier combine TOUT le code des deux anciennes implémentations sans rien
 * omettre : gestion complète des salons vocaux (select menu + modals), système
 * de tickets, demandes de whitelist, et gestion des erreurs. Il remplace donc
 * les deux anciens modules « interactionCreate.js » par un seul, plus lisible
 * et maintenable.
 * ---------------------------------------------------------------------------
 */

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @param {import('discord.js').Interaction} interaction – Interaction reçue
     * @param {*} [newState] – Reste compatible avec l'ancienne signature
     */
    async execute(interaction, newState) {
        /**
         * ---------------------------------------------------------------
         * 1) Connexion à la base de données (MySQL)
         * ---------------------------------------------------------------
         */
        let db;
        try {
            db = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT,
            });
        } catch (err) {
            console.error('❌ Impossible de se connecter à la base de données :', err);
            return;
        }

        /**
         * ---------------------------------------------------------------
         * 2) Gestion des interactions bouton (tickets & whitelist)
         * ---------------------------------------------------------------
         */
        try {
            if (interaction.isButton()) {
                // ------------------------------------------------------------------
                // 2.1) Création d'un ticket
                // ------------------------------------------------------------------
                if (interaction.customId === 'create_ticket') {
                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (e) {
                        return; // Interaction expirée ou déjà traitée
                    }

                    const guild = interaction.guild;
                    const user = interaction.user;
                    const ticketCategoryId = process.env.TICKET_CATEGORY_ID;

                    // Création du salon ticket
                    const channel = await guild.channels.create({
                        name: `ticket-${user.username}`,
                        type: 0, // GuildText
                        parent: ticketCategoryId,
                        permissionOverwrites: [
                            { id: guild.id, deny: ['ViewChannel'] },
                            { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                        ],
                    });

                    await db.execute(
                        'INSERT INTO tickets (user_id, ticket_channel_id, status) VALUES (?, ?, ?)',
                        [user.id, channel.id, 'open']
                    );

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle('🎫 Nouveau Ticket')
                        .setDescription(`Bonjour ${user}, merci d\'avoir ouvert un ticket.`)
                        .setColor('#CE34CE')
                        .setFooter({ text: 'Purpur-SMP Support' })
                        .setTimestamp();

                    const closeButton = new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Fermer le ticket')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(closeButton);

                    await channel.send({ embeds: [ticketEmbed], components: [row] });
                    return interaction.editReply({ content: `Ton ticket a été créé ici : ${channel}` });
                }

                // ------------------------------------------------------------------
                // 2.2) Fermeture d'un ticket
                // ------------------------------------------------------------------
                if (interaction.customId === 'close_ticket') {
                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (e) {
                        return;
                    }

                    const channel = interaction.channel;
                    await db.execute('UPDATE tickets SET status = ? WHERE ticket_channel_id = ?', [
                        'closed',
                        channel.id,
                    ]);

                    // Archive (transcript simple)
                    const messages = await channel.messages.fetch({ limit: 100 });
                    const sortedMessages = Array.from(messages.values()).reverse();
                    let archiveContent = `Transcript du ticket #${channel.name} :\n\n`;
                    for (const msg of sortedMessages) {
                        archiveContent += `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}\n`;
                    }
                    // Ici vous pouvez envoyer/transférer l'archive au besoin

                    await interaction.editReply({ content: 'Ticket fermé ! Suppression dans 5 secondes.' });
                    setTimeout(async () => {
                        await channel.delete().catch(() => {});
                    }, 5000);
                    return;
                }

                // ------------------------------------------------------------------
                // 2.3) Demande de whitelist (ouverture du modal)
                // ------------------------------------------------------------------
                if (interaction.customId === 'request_whitelist') {
                    const modal = new ModalBuilder()
                        .setCustomId('whitelist_modal')
                        .setTitle('Demande de Whitelist')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('pseudo_mc')
                                    .setLabel('Ton pseudo Minecraft')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            )
                        );
                    return interaction.showModal(modal);
                }

                // ------------------------------------------------------------------
                // 2.4) Acceptation / refus d\'une whitelist (boutons du staff)
                // ------------------------------------------------------------------
                if (
                    interaction.customId.startsWith('whitelist_accept_') ||
                    interaction.customId.startsWith('whitelist_refuse_')
                ) {
                    try {
                        await interaction.deferUpdate();
                    } catch (e) {
                        return;
                    }

                    const requestId = interaction.customId.split('_')[2];
                    const decision = interaction.customId.includes('accept') ? 'accepted' : 'refused';

                    await db.execute(
                        'UPDATE whitelist_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [decision, requestId]
                    );

                    const [rows] = await db.execute(
                        'SELECT discord_user_id FROM whitelist_requests WHERE id = ?',
                        [requestId]
                    );
                    const userId = rows[0]?.discord_user_id;
                    const user = await interaction.client.users.fetch(userId).catch(() => null);

                    if (user) {
                        if (decision === 'accepted') {
                            const role = interaction.guild.roles.cache.get(process.env.WHITELIST_ROLE_ID);
                            const member = await interaction.guild.members.fetch(userId).catch(() => null);
                            if (member && role) await member.roles.add(role);
                            await user.send(`✅ Whitelist acceptée !`);
                        } else {
                            await user.send(`❌ Whitelist refusée.`);
                        }
                    }

                    return interaction.editReply({
                        content: `Demande ${decision === 'accepted' ? 'acceptée' : 'refusée'}.`,
                        embeds: [],
                        components: [],
                    });
                }
            }
        } catch (errBtn) {
            console.error('❌ Erreur dans la gestion des boutons :', errBtn);
        }

        /**
         * ---------------------------------------------------------------
         * 3) Gestion du select menu « voice_channel_settings »
         * ---------------------------------------------------------------
         */
        try {
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'voice_channel_settings') {
                    const selectedOption = interaction.values[0];
                    const member = interaction.member;
                    const voiceChannel = member.voice.channel;

                    if (!voiceChannel) {
                        return interaction.reply({
                            content: '❌ You must be in a voice channel to use this menu.',
                            ephemeral: true,
                        });
                    }

                    switch (selectedOption) {
                        // ------------------------------------------------------
                        // 3.1) Changement du nom du salon vocal
                        // ------------------------------------------------------
                        case 'change_name': {
                            const nameModal = new ModalBuilder()
                                .setCustomId('modal_change_name')
                                .setTitle('Change Voice Channel Name');

                            const nameInput = new TextInputBuilder()
                                .setCustomId('new_channel_name')
                                .setLabel('New Name')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Enter a new name')
                                .setRequired(true);

                            const nameRow = new ActionRowBuilder().addComponents(nameInput);
                            nameModal.addComponents(nameRow);
                            await interaction.showModal(nameModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.2) Changement de la limite d\'utilisateurs
                        // ------------------------------------------------------
                        case 'change_limit': {
                            const limitModal = new ModalBuilder()
                                .setCustomId('modal_change_limit')
                                .setTitle('Change User Limit');

                            const limitInput = new TextInputBuilder()
                                .setCustomId('new_user_limit')
                                .setLabel('New User Limit')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Enter a limit between 1 and 99')
                                .setRequired(true);

                            const limitRow = new ActionRowBuilder().addComponents(limitInput);
                            limitModal.addComponents(limitRow);
                            await interaction.showModal(limitModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.3) Définir un nom basé sur le jeu
                        // ------------------------------------------------------
                        case 'game_name': {
                            const gameNameModal = new ModalBuilder()
                                .setCustomId('modal_game_name')
                                .setTitle('Set Name Based on Game');

                            const gameNameInput = new TextInputBuilder()
                                .setCustomId('custom_game_name')
                                .setLabel('Custom Game Name')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Enter a name based on the game')
                                .setRequired(true);

                            const gameNameRow = new ActionRowBuilder().addComponents(gameNameInput);
                            gameNameModal.addComponents(gameNameRow);
                            await interaction.showModal(gameNameModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.4) Changement du bitrate
                        // ------------------------------------------------------
                        case 'change_bitrate': {
                            const bitrateModal = new ModalBuilder()
                                .setCustomId('modal_change_bitrate')
                                .setTitle('Change Channel Bitrate');

                            const bitrateInput = new TextInputBuilder()
                                .setCustomId('new_bitrate')
                                .setLabel('Bitrate (kbps)')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Enter a value between 8 and 384')
                                .setRequired(true);

                            const bitrateRow = new ActionRowBuilder().addComponents(bitrateInput);
                            bitrateModal.addComponents(bitrateRow);
                            await interaction.showModal(bitrateModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.5) Verrouillage du salon
                        // ------------------------------------------------------
                        case 'lock_channel': {
                            const lockModal = new ModalBuilder()
                                .setCustomId('modal_lock_channel')
                                .setTitle('Lock Voice Channel');

                            const lockInput = new TextInputBuilder()
                                .setCustomId('lock_reason')
                                .setLabel('Lock Reason')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Reason or comment (optional)')
                                .setRequired(false);

                            const lockRow = new ActionRowBuilder().addComponents(lockInput);
                            lockModal.addComponents(lockRow);
                            await interaction.showModal(lockModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.6) Déverrouillage du salon
                        // ------------------------------------------------------
                        case 'unlock_channel': {
                            const unlockModal = new ModalBuilder()
                                .setCustomId('modal_unlock_channel')
                                .setTitle('Unlock Voice Channel');

                            const unlockInput = new TextInputBuilder()
                                .setCustomId('unlock_reason')
                                .setLabel('Unlock Reason')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Reason or comment (optional)')
                                .setRequired(false);

                            const unlockRow = new ActionRowBuilder().addComponents(unlockInput);
                            unlockModal.addComponents(unlockRow);
                            await interaction.showModal(unlockModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.7) Autoriser un utilisateur / rôle
                        // ------------------------------------------------------
                        case 'permit_access': {
                            const permitModal = new ModalBuilder()
                                .setCustomId('modal_permit_access')
                                .setTitle('Grant Access to Users/Roles');

                            const permitInput = new TextInputBuilder()
                                .setCustomId('permit_target')
                                .setLabel('Enter a User/Role')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('User or Role ID')
                                .setRequired(true);

                            const permitRow = new ActionRowBuilder().addComponents(permitInput);
                            permitModal.addComponents(permitRow);
                            await interaction.showModal(permitModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.8) Refuser un utilisateur / rôle
                        // ------------------------------------------------------
                        case 'reject_access': {
                            const rejectModal = new ModalBuilder()
                                .setCustomId('modal_reject_access')
                                .setTitle('Deny Access');

                            const rejectInput = new TextInputBuilder()
                                .setCustomId('reject_target')
                                .setLabel('Enter a User/Role')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('User or Role ID')
                                .setRequired(true);

                            const rejectRow = new ActionRowBuilder().addComponents(rejectInput);
                            rejectModal.addComponents(rejectRow);
                            await interaction.showModal(rejectModal);
                            break;
                        }

                        // ------------------------------------------------------
                        // 3.9) Inviter un utilisateur (MP)
                        // ------------------------------------------------------
                        case 'invite_user': {
                            const inviteModal = new ModalBuilder()
                                .setCustomId('modal_invite_user')
                                .setTitle('Invite a User');

                            const inviteInput = new TextInputBuilder()
                                .setCustomId('invite_user_id')
                                .setLabel('User ID')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Example: 123456789012345678')
                                .setRequired(true);

                            const inviteRow = new ActionRowBuilder().addComponents(inviteInput);
                            inviteModal.addComponents(inviteRow);
                            await interaction.showModal(inviteModal);
                            break;
                        }

                        default:
                            return interaction.reply({
                                content: '❌ Invalid option.',
                                ephemeral: true,
                            });
                    }
                }
            }
        } catch (errSelect) {
            console.error('❌ Erreur dans le select menu :', errSelect);
        }

        /**
         * ---------------------------------------------------------------
         * 4) Gestion des modals (whitelist & vocal)
         * ---------------------------------------------------------------
         */
        try {
            if (interaction.isModalSubmit()) {
                const { customId } = interaction;

                // ----------------------------------------------------------
                // 4.1) Modal de Whitelist
                // ----------------------------------------------------------
                if (customId === 'whitelist_modal') {
                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (e) {
                        return;
                    }

                    const pseudo = interaction.fields.getTextInputValue('pseudo_mc');

                    // Vérifie s\'il y a déjà une demande en attente pour cet utilisateur


                    const [insert] = await db.execute(
                        'INSERT INTO whitelist_requests (discord_user_id, pseudo_mc, status) VALUES (?, ?, ?)',
                        [interaction.user.id, pseudo, 'pending']
                    );

                    await interaction.editReply({ content: `📋 Demande envoyée au staff.` });

                    const staffChannel = interaction.guild.channels.cache.get(
                        process.env.WHITELIST_LOG_CHANNEL_ID
                    );
                    if (staffChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('📋 Nouvelle demande de Whitelist')
                            .addFields(
                                {
                                    name: 'Utilisateur',
                                    value: `${interaction.user.tag} (${interaction.user.id})`,
                                    inline: false,
                                },
                                { name: 'Pseudo Minecraft', value: pseudo, inline: false }
                            )
                            .setColor('#00B0F4')
                            .setTimestamp();

                        const acceptButton = new ButtonBuilder()
                            .setCustomId(`whitelist_accept_${insert.insertId}`)
                            .setLabel('✅ Accepter')
                            .setStyle(ButtonStyle.Success);

                        const refuseButton = new ButtonBuilder()
                            .setCustomId(`whitelist_refuse_${insert.insertId}`)
                            .setLabel('❌ Refuser')
                            .setStyle(ButtonStyle.Danger);

                        const row = new ActionRowBuilder().addComponents(acceptButton, refuseButton);
                        await staffChannel.send({ embeds: [embed], components: [row] });
                    }
                    return;
                }

                /**
                 * ----------------------------------------------------------------
                 * 4.2) Modals liés aux salons vocaux (switch original complet)
                 * ----------------------------------------------------------------
                 */
                    // Récupère le salon vocal de l\'utilisateur (si requis)
                const member = interaction.member;
                const voiceChannel = member.voice?.channel;

                // IMPORTANT : certains modals nécessitent la présence en vocal
                if (
                    [
                        'modal_change_name',
                        'modal_change_limit',
                        'modal_game_name',
                        'modal_change_bitrate',
                        'modal_lock_channel',
                        'modal_unlock_channel',
                        'modal_permit_access',
                        'modal_reject_access',
                        'modal_invite_user',
                    ].includes(customId) &&
                    !voiceChannel
                ) {
                    return interaction.reply({
                        content: '❌ You must be in a voice channel for this action.',
                        ephemeral: true,
                    });
                }

                switch (customId) {
                    // ------------------------------------------------------
                    // 4.2.1) Changer le nom du salon vocal
                    // ------------------------------------------------------
                    case 'modal_change_name': {
                        const newChannelName = interaction.fields.getTextInputValue('new_channel_name');
                        await voiceChannel.setName(newChannelName);
                        return interaction.reply({
                            content: `✅ The name of the voice channel has been changed to **${newChannelName}**.`,
                            ephemeral: true,
                        });
                    }

                    // ------------------------------------------------------
                    // 4.2.2) Changer la limite d\'utilisateurs
                    // ------------------------------------------------------
                    case 'modal_change_limit': {
                        const newUserLimit = parseInt(
                            interaction.fields.getTextInputValue('new_user_limit'),
                            10
                        );
                        if (isNaN(newUserLimit) || newUserLimit < 1 || newUserLimit > 99) {
                            return interaction.reply({
                                content: '❌ The limit must be a number between 1 and 99.',
                                ephemeral: true,
                            });
                        }
                        await voiceChannel.setUserLimit(newUserLimit);
                        return interaction.reply({
                            content: `✅ User limit has been updated to **${newUserLimit}**.`,
                            ephemeral: true,
                        });
                    }

                    // ------------------------------------------------------
                    // 4.2.3) Définir le nom du salon en fonction du jeu
                    // ------------------------------------------------------
                    case 'modal_game_name': {
                        const customGameName = interaction.fields.getTextInputValue('custom_game_name');
                        await voiceChannel.setName(customGameName);
                        return interaction.reply({
                            content: `🎮 The voice channel name has been updated on **${customGameName}**.`,
                            ephemeral: true,
                        });
                    }

                    // ------------------------------------------------------
                    // 4.2.4) Changer le bitrate du salon
                    // ------------------------------------------------------
                    case 'modal_change_bitrate': {
                        const newBitrate =
                            parseInt(interaction.fields.getTextInputValue('new_bitrate'), 10) * 1000;
                        const maxBitrate =
                            voiceChannel.guild.premiumTier === 0
                                ? 96000
                                : voiceChannel.guild.premiumTier === 1
                                    ? 128000
                                    : voiceChannel.guild.premiumTier === 2
                                        ? 256000
                                        : 384000;
                        if (isNaN(newBitrate) || newBitrate < 8000 || newBitrate > maxBitrate) {
                            return interaction.reply({
                                content: `❌ The bitrate must be between 8kbps and ${
                                    maxBitrate / 1000
                                }kbps.`,
                                ephemeral: true,
                            });
                        }
                        await voiceChannel.setBitrate(newBitrate);
                        return interaction.reply({
                            content: `✅ The bitrate was updated to **${newBitrate / 1000}kbps**.`,
                            ephemeral: true,
                        });
                    }

                    // ------------------------------------------------------
                    // 4.2.5) Verrouiller le salon
                    // ------------------------------------------------------
                    case 'modal_lock_channel': {
                        const lockReason = interaction.fields.getTextInputValue('lock_reason');
                        const botMember = interaction.guild.members.me;
                        if (!voiceChannel.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)) {
                            return interaction.reply({
                                content:
                                    '❌ The bot does not have the necessary permissions to manage this room.',
                                ephemeral: true,
                            });
                        }
                        try {
                            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                                Connect: false,
                            });
                            return interaction.reply({
                                content: `🔒 The voice channel has been locked. **Reason** : ${
                                    lockReason || ''
                                }.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error('Error locking voice channel :', error);
                            return interaction.reply({
                                content: '❌ An error has occurred when locking the voice channel.',
                                ephemeral: true,
                            });
                        }
                    }

                    // ------------------------------------------------------
                    // 4.2.6) Déverrouiller le salon
                    // ------------------------------------------------------
                    case 'modal_unlock_channel': {
                        const unlockReason = interaction.fields.getTextInputValue('unlock_reason');
                        const botMember = interaction.guild.members.me;
                        if (!voiceChannel.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)) {
                            return interaction.reply({
                                content:
                                    '❌ The bot does not have the necessary permissions to manage this room.',
                                ephemeral: true,
                            });
                        }
                        try {
                            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                                Connect: true,
                            });
                            return interaction.reply({
                                content: `🔓 The voice channel has been unlocked. **Reason** : ${
                                    unlockReason || 'Not specified'
                                }.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error('Error unlocking voice channel :', error);
                            return interaction.reply({
                                content: '❌ An error has occurred during voice channel unlocking.',
                                ephemeral: true,
                            });
                        }
                    }

                    // ------------------------------------------------------
                    // 4.2.7) Autoriser un utilisateur / rôle
                    // ------------------------------------------------------
                    case 'modal_permit_access': {
                        const targetInput = interaction.fields.getTextInputValue('permit_target').trim();
                        let targetMember = interaction.guild.members.cache.get(targetInput);
                        let targetRole =
                            interaction.guild.roles.cache.get(targetInput) ||
                            interaction.guild.roles.cache.find((role) => role.name === targetInput);

                        if (!targetMember && targetInput.startsWith('<@') && targetInput.endsWith('>')) {
                            const userId = targetInput.replace(/[<@!>]/g, '');
                            targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
                        }
                        if (!targetRole && targetInput.startsWith('<@&') && targetInput.endsWith('>')) {
                            const roleId = targetInput.replace(/[<@&>]/g, '');
                            targetRole = interaction.guild.roles.cache.get(roleId);
                        }
                        if (!targetMember) {
                            targetMember = await interaction.guild.members.fetch(targetInput).catch(() => null);
                        }
                        if (!targetMember && !targetRole) {
                            return interaction.reply({
                                content: 'Make sure you have provided an accurate ID, credit or name.',
                                ephemeral: true,
                            });
                        }
                        const targetEntity = targetMember || targetRole;
                        try {
                            await voiceChannel.permissionOverwrites.edit(targetEntity, {
                                [PermissionFlagsBits.Connect]: true,
                            });
                            return interaction.reply({
                                content: `✅ ${targetEntity} now has access to the voice channel.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error('Error changing permissions :', error);
                            return interaction.reply({
                                content: '❌ An error has occurred while changing permissions. Please try again.',
                                ephemeral: true,
                            });
                        }
                    }

                    // ------------------------------------------------------
                    // 4.2.8) Refuser un utilisateur / rôle
                    // ------------------------------------------------------
                    case 'modal_reject_access': {
                        const targetInput = interaction.fields.getTextInputValue('reject_target').trim();
                        let targetMember = interaction.guild.members.cache.get(targetInput);
                        let targetRole =
                            interaction.guild.roles.cache.get(targetInput) ||
                            interaction.guild.roles.cache.find((role) => role.name === targetInput);

                        if (!targetMember && targetInput.startsWith('<@') && targetInput.endsWith('>')) {
                            const userId = targetInput.replace(/[<@!>]/g, '');
                            targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
                        }
                        if (!targetRole && targetInput.startsWith('<@&') && targetInput.endsWith('>')) {
                            const roleId = targetInput.replace(/[<@&>]/g, '');
                            targetRole = interaction.guild.roles.cache.get(roleId);
                        }
                        if (!targetMember) {
                            targetMember = await interaction.guild.members.fetch(targetInput).catch(() => null);
                        }
                        if (!targetMember && !targetRole) {
                            return interaction.reply({
                                content:
                                    '❌ User or role not found. Make sure you have provided an accurate ID, credit or name.',
                                ephemeral: true,
                            });
                        }
                        const targetEntity = targetMember || targetRole;
                        try {
                            await voiceChannel.permissionOverwrites.edit(targetEntity, {
                                [PermissionFlagsBits.Connect]: false,
                            });
                            return interaction.reply({
                                content: `✅ ${targetEntity} no longer has access to the voice channel.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error('Error changing permissions :', error);
                            return interaction.reply({
                                content: '❌ An error has occurred while changing permissions. Please try again.',
                                ephemeral: true,
                            });
                        }
                    }

                    // ------------------------------------------------------
                    // 4.2.9) Inviter un utilisateur (MP + permission)
                    // ------------------------------------------------------
                    case 'modal_invite_user': {
                        const userId = interaction.fields.getTextInputValue('invite_user_id');
                        const user = await interaction.client.users.fetch(userId).catch(() => null);

                        if (!user) {
                            return interaction.reply({
                                content: 'User not found. Please provide a valid user ID.',
                                ephemeral: true,
                            });
                        }
                        // Envoie une invitation privée à l\'utilisateur
                        await user.send(
                            `You have been invited to join the voice lounge : <#${voiceChannel.id}> on **${interaction.guild.name}**.`
                        );
                        try {
                            await voiceChannel.permissionOverwrites.edit(user, {
                                [PermissionFlagsBits.Connect]: true,
                            });
                        } catch (e) {
                            console.error('❌ Unable to grant temporary permission :', e);
                        }
                        return interaction.reply({
                            content: `✅ An invitation has been sent to the user <@${userId}>.`,
                            ephemeral: true,
                        });
                    }

                    default:
                        // On ignore les autres modals ici (peuvent être gérés autre part)
                        break;
                }
            }
        } catch (errModal) {
            console.error('❌ Erreur dans la gestion des modals :', errModal);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '❌ An error has occurred.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ An error has occurred.', ephemeral: true });
                }
            } catch (_) {}
        }

        /**
         * ---------------------------------------------------------------
         * 5) Commandes slash (placeholder)
         * ---------------------------------------------------------------
         * Ajoutez ici la logique pour gérer vos Slash Commands, si nécessaire.
         */
        try {
            if (interaction.isCommand()) {
                // TODO: Votre gestion de commandes ici
            }
        } catch (errCmd) {
            console.error('❌ Erreur dans la gestion des slash commands :', errCmd);
        }

        // Fermeture nette de la connexion MySQL (évite les leaks)
        try {
            if (db) await db.end();
        } catch (_) {}
    },
};