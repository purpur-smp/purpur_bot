const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (client, user, pseudo, requestId) => {
    const channel = client.channels.cache.get(process.env.WHITELIST_LOG_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Nouvelle demande de Whitelist')
        .addFields(
            { name: 'Utilisateur', value: `${user.tag} (${user.id})`, inline: false },
            { name: 'Pseudo Minecraft', value: pseudo, inline: false },
        )
        .setColor('##CE34CE')
        .setTimestamp();

    const acceptButton = new ButtonBuilder()
        .setCustomId(`whitelist_accept_${requestId}`)
        .setLabel('Accepter')
        .setStyle(ButtonStyle.Success);

    const refuseButton = new ButtonBuilder()
        .setCustomId(`whitelist_refuse_${requestId}`)
        .setLabel('Refuser')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(acceptButton, refuseButton);

    await channel.send({ embeds: [embed], components: [row] });
};