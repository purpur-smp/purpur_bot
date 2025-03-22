const {
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");
const mysql = require("mysql2/promise");

// Configuration de la base de données
const createConnection = async () =>
    await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
    });

// Gestion de la base de données
const db = {
    addTemporaryChannel: async (userId, channelId) => {
        const connection = await createConnection();
        await connection.execute(
            `INSERT INTO temporary_channels (user_id, channel_id) VALUES (?, ?)`,
            [userId, channelId]
        );
        await connection.end();
    },
    removeTemporaryChannel: async (channelId) => {
        const connection = await createConnection();
        await connection.execute(
            `DELETE FROM temporary_channels WHERE channel_id = ?`,
            [channelId]
        );
        await connection.end();
    },
    getTemporaryChannelOwner: async (channelId) => {
        const connection = await createConnection();
        const [rows] = await connection.execute(
            `SELECT user_id FROM temporary_channels WHERE channel_id = ?`,
            [channelId]
        );
        await connection.end();
        return rows[0]?.user_id || null;
    },
};

// Création de l'embed pour la gestion du salon vocal
const createVoiceChannelEmbed = (userId) => {
    const embed = new EmbedBuilder()
        .setTitle("🎙️ Welcome to your voice channel!")
        .setDescription(
            "Use the dropdown menu below to configure your voice channel settings."
        )
        .setColor("#FF81FF")
        .setFooter({ text: "Voice Channel Manager" });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("voice_channel_settings")
            .setPlaceholder("Configure your channel")
            .addOptions(
                {
                    label: "Change Name",
                    description: "Change the name of your channel.",
                    value: "change_name",
                    emoji: "📝",
                },
                {
                    label: "Change Limit",
                    description: "Set the maximum number of users.",
                    value: "change_limit",
                    emoji: "👥",
                },
                {
                    label: "Game Name",
                    description: "Set the channel name to the game you are playing.",
                    value: "game_name",
                    emoji: "🎮",
                },
                {
                    label: "Change Bitrate",
                    description: "Adjust the audio bitrate.",
                    value: "change_bitrate",
                    emoji: "🔊",
                },
                {
                    label: "Lock Channel",
                    description: "Lock the channel for others.",
                    value: "lock_channel",
                    emoji: "🔒",
                },
                {
                    label: "Unlock Channel",
                    description: "Unlock the channel for others.",
                    value: "unlock_channel",
                    emoji: "🔓",
                },
                {
                    label: "Permit Access",
                    description: "Allow specific users/roles to join.",
                    value: "permit_access",
                    emoji: "✅",
                },
                {
                    label: "Reject Access",
                    description: "Kick specific users/roles.",
                    value: "reject_access",
                    emoji: "❌",
                },
                {
                    label: "Invite User",
                    description: "Invite a user to the channel.",
                    value: "invite_user",
                    emoji: "➕",
                }
            )

    );

    return { embed, row, mention: `<@${userId}>` };
};

// Gestion de la création du salon vocal temporaire
const handleVoiceChannelCreate = async (newState) => {
    const member = newState.member;
    const guild = newState.guild;

    // Crée un nouveau salon vocal
    const voiceChannel = await guild.channels.create({
        name: `${member.user.username}'s Room`,
        type: 2, // 2 = salon vocal
        parent: process.env.TEMP_VOICE_CATEGORY_ID, // Définit la catégorie
        permissionOverwrites: [
            {
                id: member.id,
                allow: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.Speak,
                ],
            },
            {
                id: guild.roles.everyone.id,
                allow: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.Speak,
                ],
            },
        ],
    });

    // Enregistre le salon dans la base de données
    await db.addTemporaryChannel(member.id, voiceChannel.id);

    // Déplace l'utilisateur dans le nouveau salon vocal
    await member.voice.setChannel(voiceChannel);

    // Vérifie si le salon vocal supporte les messages texte
    if (voiceChannel.isTextBased()) {
        const { embed, row, mention } = createVoiceChannelEmbed(member.id);
        await voiceChannel.send({ content: mention, embeds: [embed], components: [row] });
        console.log(`Embed sent to the voice channel chat: ${voiceChannel.name}`);
    } else {
        console.warn("The voice channel does not support text messages.");
    }
};

// Gestion de la suppression du salon vocal temporaire
const handleVoiceChannelDelete = async (oldState) => {
    const ownerId = await db.getTemporaryChannelOwner(oldState.channelId);
    if (!ownerId) return;

    const voiceChannel = oldState.guild.channels.cache.get(oldState.channelId);
    if (voiceChannel && voiceChannel.members.size === 0) {
        // Supprime le salon s'il est vide
        await voiceChannel.delete();
        await db.removeTemporaryChannel(oldState.channelId);
        console.log(`Deleted temporary voice channel for user ${ownerId}`);
    }
};

// Gestion de l'événement voiceStateUpdate
module.exports = async (oldState, newState) => {
    if (newState.channelId === process.env.HUB_VOICE_CHANNEL_ID) {
        await handleVoiceChannelCreate(newState);
    } else if (oldState.channelId) {
        await handleVoiceChannelDelete(oldState);
    }
};