require('dotenv').config();
const { PermissionFlagsBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder,
    ButtonBuilder, ButtonStyle
} = require('discord.js');
const mysql = require('mysql2/promise');



module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction,newState) {
        try {

            const db = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT
            });


            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'voice_channel_settings') {
                    const selectedOption = interaction.values[0];
                    const member = interaction.member;
                    const voiceChannel = member.voice.channel;

                    if (!voiceChannel) {
                        return interaction.reply({
                            content: "❌ You must be in a voice channel to use this menu.",
                            ephemeral: true,
                        });
                    }

                    switch (selectedOption) {
                        case "change_name": {
                            const nameModal = new ModalBuilder()
                                .setCustomId("modal_change_name")
                                .setTitle("Change Voice Channel Name");

                            const nameInput = new TextInputBuilder()
                                .setCustomId("new_channel_name")
                                .setLabel("New Name")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("Enter a new name")
                                .setRequired(true);

                            const nameRow = new ActionRowBuilder().addComponents(nameInput);
                            nameModal.addComponents(nameRow);
                            await interaction.showModal(nameModal);
                            break;
                        }

                        case "change_limit": {
                            const limitModal = new ModalBuilder()
                                .setCustomId("modal_change_limit")
                                .setTitle("Change User Limit");

                            const limitInput = new TextInputBuilder()
                                .setCustomId("new_user_limit")
                                .setLabel("New User Limit")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("Enter a limit between 1 and 99")
                                .setRequired(true);

                            const limitRow = new ActionRowBuilder().addComponents(limitInput);
                            limitModal.addComponents(limitRow);
                            await interaction.showModal(limitModal);
                            break;
                        }

                        case "game_name": {
                            const gameNameModal = new ModalBuilder()
                                .setCustomId("modal_game_name")
                                .setTitle("Set Name Based on Game");

                            const gameNameInput = new TextInputBuilder()
                                .setCustomId("custom_game_name")
                                .setLabel("Custom Game Name")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("Enter a name based on the game")
                                .setRequired(true);

                            const gameNameRow = new ActionRowBuilder().addComponents(gameNameInput);
                            gameNameModal.addComponents(gameNameRow);
                            await interaction.showModal(gameNameModal);
                            break;
                        }

                        case "change_bitrate": {
                            const bitrateModal = new ModalBuilder()
                                .setCustomId("modal_change_bitrate")
                                .setTitle("Change Channel Bitrate");

                            const bitrateInput = new TextInputBuilder()
                                .setCustomId("new_bitrate")
                                .setLabel("Bitrate (kbps)")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("Enter a value between 8 and 384")
                                .setRequired(true);

                            const bitrateRow = new ActionRowBuilder().addComponents(bitrateInput);
                            bitrateModal.addComponents(bitrateRow);
                            await interaction.showModal(bitrateModal);
                            break;
                        }

                        case "lock_channel": {
                            const lockModal = new ModalBuilder()
                                .setCustomId("modal_lock_channel")
                                .setTitle("Lock Voice Channel");

                            const lockInput = new TextInputBuilder()
                                .setCustomId("lock_reason")
                                .setLabel("Lock Reason")
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder("Reason or comment (optional)")
                                .setRequired(false);

                            const lockRow = new ActionRowBuilder().addComponents(lockInput);
                            lockModal.addComponents(lockRow);
                            await interaction.showModal(lockModal);
                            break;
                        }

                        case "unlock_channel": {
                            const unlockModal = new ModalBuilder()
                                .setCustomId("modal_unlock_channel")
                                .setTitle("Unlock Voice Channel");

                            const unlockInput = new TextInputBuilder()
                                .setCustomId("unlock_reason")
                                .setLabel("Unlock Reason")
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder("Reason or comment (optional)")
                                .setRequired(false);

                            const unlockRow = new ActionRowBuilder().addComponents(unlockInput);
                            unlockModal.addComponents(unlockRow);
                            await interaction.showModal(unlockModal);
                            break;
                        }

                        case "permit_access": {
                            const permitModal = new ModalBuilder()
                                .setCustomId("modal_permit_access")
                                .setTitle("Grant Access to Users/Roles");

                            const permitInput = new TextInputBuilder()
                                .setCustomId("permit_target")
                                .setLabel("Enter a User/Role")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("User or Role ID")
                                .setRequired(true);

                            const permitRow = new ActionRowBuilder().addComponents(permitInput);
                            permitModal.addComponents(permitRow);
                            await interaction.showModal(permitModal);
                            break;
                        }

                        case "reject_access": {
                            const rejectModal = new ModalBuilder()
                                .setCustomId("modal_reject_access")
                                .setTitle("Deny Access");

                            const rejectInput = new TextInputBuilder()
                                .setCustomId("reject_target")
                                .setLabel("Enter a User/Role")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("User or Role ID")
                                .setRequired(true);

                            const rejectRow = new ActionRowBuilder().addComponents(rejectInput);
                            rejectModal.addComponents(rejectRow);
                            await interaction.showModal(rejectModal);
                            break;
                        }

                        case "invite_user": {
                            const inviteModal = new ModalBuilder()
                                .setCustomId("modal_invite_user")
                                .setTitle("Invite a User");

                            const inviteInput = new TextInputBuilder()
                                .setCustomId("invite_user_id")
                                .setLabel("User ID")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("Example: 123456789012345678")
                                .setRequired(true);

                            const inviteRow = new ActionRowBuilder().addComponents(inviteInput);
                            inviteModal.addComponents(inviteRow);
                            await interaction.showModal(inviteModal);
                            break;
                        }

                        default:
                            return interaction.reply({
                                content: "❌ Invalid option.",
                                ephemeral: true,
                            });
                    }
                }
            }


            // Gestion des modals
            if (interaction.isModalSubmit()) {
                const { customId } = interaction;

                console.log("Received modal ID :", customId); // Ajoute ce log pour inspecter l'ID

                // Vérifie si l'utilisateur est dans un salon vocal
                const member = interaction.member;
                const voiceChannel = member.voice.channel;
                if (!voiceChannel) {
                    return interaction.reply({
                        content: "❌ You must be in a voice channel for this action.",
                        ephemeral: true,
                    });
                }

                switch (customId) {
                    case "modal_change_name": {
                        const newChannelName = interaction.fields.getTextInputValue("new_channel_name");

                        // Change le nom du salon vocal
                        await voiceChannel.setName(newChannelName);
                        return interaction.reply({
                            content: `✅ The name of the voice channel has been changed to **${newChannelName}**.`,
                            ephemeral: true,
                        });
                    }

                    case "modal_change_limit": {
                        const newUserLimit = parseInt(interaction.fields.getTextInputValue("new_user_limit"), 10);

                        // Vérifie la validité de la limite
                        if (isNaN(newUserLimit) || newUserLimit < 1 || newUserLimit > 99) {
                            return interaction.reply({
                                content: "❌ The limit must be a number between 1 and 99.",
                                ephemeral: true,
                            });
                        }

                        // Change la limite d'utilisateurs
                        await voiceChannel.setUserLimit(newUserLimit);
                        return interaction.reply({
                            content: `✅ User limit has been updated to **${newUserLimit}**.`,
                            ephemeral: true,
                        });
                    }

                    case "modal_game_name": {
                        const customGameName = interaction.fields.getTextInputValue("custom_game_name");

                        // Change le nom du salon vocal pour refléter le jeu spécifié
                        await voiceChannel.setName(customGameName);
                        return interaction.reply({
                            content: `🎮 The voice channel name has been updated on **${customGameName}**.`,
                            ephemeral: true,
                        });
                    }

                    case "modal_change_bitrate": {
                        const newBitrate = parseInt(interaction.fields.getTextInputValue("new_bitrate"), 10) * 1000;

                        // Vérifie les limites du bitrate
                        const maxBitrate =
                            voiceChannel.guild.premiumTier === 0 // Niveau Nitro de base
                                ? 96000
                                : voiceChannel.guild.premiumTier === 1 // Boost niveau 1
                                    ? 128000
                                    : voiceChannel.guild.premiumTier === 2 // Boost niveau 2
                                        ? 256000
                                        : 384000; // Boost niveau 3

                        if (isNaN(newBitrate) || newBitrate < 8000 || newBitrate > maxBitrate) {
                            return interaction.reply({
                                content: `❌ The bitrate must be between 8kbps and ${maxBitrate / 1000}kbps.`,
                                ephemeral: true,
                            });
                        }

                        // Change le bitrate du salon vocal
                        await voiceChannel.setBitrate(newBitrate);
                        return interaction.reply({
                            content: `✅ The bitrate was updated to **${newBitrate / 1000}kbps**.`,
                            ephemeral: true,
                        });
                    }

                    case "modal_lock_channel": {
                        const lockReason = interaction.fields.getTextInputValue("lock_reason");

                        // Vérifie si l'utilisateur est dans un salon vocal
                        const member = interaction.member;
                        const voiceChannel = member.voice.channel;

                        if (!voiceChannel) {
                            return interaction.reply({
                                content: "❌ You must be in a voice channel for this action.",
                                ephemeral: true,
                            });
                        }

                        // Vérifie que le bot a les permissions nécessaires
                        const botMember = interaction.guild.members.me;
                        if (!voiceChannel.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)) {
                            return interaction.reply({
                                content: "❌ The bot does not have the necessary permissions to manage this room.",
                                ephemeral: true,
                            });
                        }

                        // Vérifie le rôle @everyone
                        const everyoneRole = interaction.guild.roles.everyone;
                        if (!everyoneRole) {
                            return interaction.reply({
                                content: "❌ Unable to find role @everyone.",
                                ephemeral: true,
                            });
                        }

                        try {
                            // Verrouille le salon vocal
                            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                                Connect: false, // Utilisation correcte de PermissionFlagsBits
                            });

                            return interaction.reply({
                                content: `🔒 The voice channel has been locked. **Reason** : ${lockReason || ""}.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error("Error locking voice channel :", error);
                            return interaction.reply({
                                content: "❌ An error has occurred when locking the voice channel.",
                                ephemeral: true,
                            });
                        }
                    }

                    case "modal_unlock_channel": {
                        const unlockReason = interaction.fields.getTextInputValue("unlock_reason");

                        // Vérifie si l'utilisateur est dans un salon vocal
                        const member = interaction.member;
                        const voiceChannel = member.voice.channel;

                        if (!voiceChannel) {
                            return interaction.reply({
                                content: "❌ You must be in a voice channel to perform this action.",
                                ephemeral: true,
                            });
                        }

                        // Vérifie que le bot a les permissions nécessaires
                        const botMember = interaction.guild.members.me;
                        if (!voiceChannel.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)) {
                            return interaction.reply({
                                content: "❌ The bot does not have the necessary permissions to manage this room.",
                                ephemeral: true,
                            });
                        }

                        // Vérifie le rôle @everyone
                        const everyoneRole = interaction.guild.roles.everyone;
                        if (!everyoneRole) {
                            return interaction.reply({
                                content: "❌ Unable to find role @everyone.",
                                ephemeral: true,
                            });
                        }

                        try {
                            // Verrouille le salon vocal
                            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                                Connect: true, // Utilisation correcte de PermissionFlagsBits
                            });

                            return interaction.reply({
                                content: `🔓 The voice channel has been unlocked. **Reason** : ${unlockReason || "Not specified"}.`,
                                ephemeral: true,
                            });
                        } catch (error) {
                            console.error("Error unlocking voice channel :", error);
                            return interaction.reply({
                                content: "❌ An error has occurred during voice channel unlocking.",
                                ephemeral: true,
                            });
                        }
                    }

                    case "modal_permit_access": {
                        const targetInput = interaction.fields.getTextInputValue("permit_target").trim();
                        let targetMember = interaction.guild.members.cache.get(targetInput);
                        let targetRole = interaction.guild.roles.cache.get(targetInput) || interaction.guild.roles.cache.find(role => role.name === targetInput);

                        // Si mention utilisateur
                        if (!targetMember && targetInput.startsWith("<@") && targetInput.endsWith(">")) {
                            const userId = targetInput.replace(/[<@!>]/g, "");
                            targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
                        }

                        // Si mention rôle
                        if (!targetRole && targetInput.startsWith("<@&") && targetInput.endsWith(">")) {
                            const roleId = targetInput.replace(/[<@&>]/g, "");
                            targetRole = interaction.guild.roles.cache.get(roleId);
                        }

                        // Si non trouvé, essayer une requête explicite
                        if (!targetMember) {
                            targetMember = await interaction.guild.members.fetch(targetInput).catch(() => null);
                        }

                        if (!targetMember && !targetRole) {
                            return interaction.reply({
                                content: "Make sure you have provided an accurate ID, credit or name.",
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
                            console.error("Error changing permissions :", error);
                            return interaction.reply({
                                content: "❌ An error has occurred while changing permissions. Please try again.",
                                ephemeral: true,
                            });
                        }
                    }

                    case "modal_reject_access": {
                        const targetInput = interaction.fields.getTextInputValue("reject_target").trim();
                        let targetMember = interaction.guild.members.cache.get(targetInput);
                        let targetRole = interaction.guild.roles.cache.get(targetInput) || interaction.guild.roles.cache.find(role => role.name === targetInput);

                        // Si mention utilisateur
                        if (!targetMember && targetInput.startsWith("<@") && targetInput.endsWith(">")) {
                            const userId = targetInput.replace(/[<@!>]/g, "");
                            targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
                        }

                        // Si mention rôle
                        if (!targetRole && targetInput.startsWith("<@&") && targetInput.endsWith(">")) {
                            const roleId = targetInput.replace(/[<@&>]/g, "");
                            targetRole = interaction.guild.roles.cache.get(roleId);
                        }

                        // Si non trouvé, essayer une requête explicite
                        if (!targetMember) {
                            targetMember = await interaction.guild.members.fetch(targetInput).catch(() => null);
                        }

                        if (!targetMember && !targetRole) {
                            return interaction.reply({
                                content: "❌ User or role not found. Make sure you have provided an accurate ID, credit or name.",
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
                            console.error("Error changing permissions :", error);
                            return interaction.reply({
                                content: "❌ An error has occurred while changing permissions. Please try again.",
                                ephemeral: true,
                            });
                        }
                    }

                    case "modal_invite_user": {
                        const userId = interaction.fields.getTextInputValue("invite_user_id");
                        const user = await interaction.client.users.fetch(userId).catch(() => null);

                        if (!user) {
                            return interaction.reply({
                                content: "User not found. Please provide a valid user ID.",
                                ephemeral: true,
                            });
                        }

                        // Envoie une invitation privée à l'utilisateur
                        await user.send(
                            `You have been invited to join the voice lounge : <#${voiceChannel.id}> on **${interaction.guild.name}**.`
                        );
                        await voiceChannel.permissionOverwrites.edit(targetEntity, {
                            [PermissionFlagsBits.Connect]: true,
                        });
                        return interaction.reply({
                            content: `✅ An invitation has been sent to the user <@${userId}>.`,
                            ephemeral: true,
                        });
                    }

                    default:
                        return interaction.reply({
                            content: "❌ An error has occurred : modal not recognized..",
                            ephemeral: true,
                        });
                }
            }

            if (interaction.customId === 'create_ticket') {
                const guild = interaction.guild;
                const user = interaction.user;

                const ticketCategoryId = process.env.TICKET_CATEGORY_ID;

                const channel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: 0, // GUILD_TEXT
                    parent: ticketCategoryId,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: ['ViewChannel'],
                        },
                        {
                            id: user.id,
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                        },
                    ],
                });
                await db.execute(
                    'INSERT INTO tickets (user_id, ticket_channel_id, status) VALUES (?, ?, ?)',
                    [user.id, channel.id, 'open']
                );

                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Nouveau Ticket')
                    .setDescription(`Bonjour ${user}, merci d'avoir ouvert un ticket.\nUn membre du staff va vous aider bientôt.`)
                    .setColor('#CE34CE')
                    .setFooter({ text: 'Purpur-SMP Support'})
                    .setTimestamp();

                const closeButton = new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Fermer le ticket')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(closeButton);

                await channel.send({ embeds: [ticketEmbed], components: [row] });

                await interaction.reply({ content: `Ton ticket a été créé ici : ${channel}`, ephemeral: true });
            }

            if (interaction.customId === 'close_ticket') {
                const channel = interaction.channel;

                // 1. Changer le status dans la base
                await db.execute(
                    'UPDATE tickets SET status = ? WHERE ticket_channel_id = ?',
                    ['closed', channel.id]
                );

                // 2. Récupérer tous les messages du salon pour faire l'archive
                const messages = await channel.messages.fetch({ limit: 100 });
                const sortedMessages = Array.from(messages.values()).reverse();

                let archiveContent = `Transcript du ticket #${channel.name} :\n\n`;
                for (const msg of sortedMessages) {
                    archiveContent += `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}\n`;
                }

                // 4. Répondre à l'utilisateur + supprimer le salon après 5 secondes
                await interaction.reply({ content: 'Ticket fermé ! Le salon sera supprimé dans 5 secondes.', ephemeral: true });

                setTimeout(async () => {
                    await channel.delete();
                }, 5000);
            }




            // Gestion des commandes slash (si nécessaire)
            if (interaction.isCommand()) {
                // Ajoute ici la logique pour gérer les commandes slash
            }
        } catch (error) {
            console.error("Erreur dans interactionCreate :", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "❌ An error has occurred.",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "❌ An error has occurred.",
                    ephemeral: true,
                });
            }
        }
    },
};
