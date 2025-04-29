const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = async (client, message) => {
    if (message.author.bot) return;

    if (message.content === '!setup-whitelist') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Tu n\'as pas la permission d\'utiliser cette commande.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Demande de Whitelist')
            .setDescription('Clique sur le bouton ci-dessous pour faire ta demande de whitelist sur le serveur Minecraft !')
            .setColor('#CE34CE')
            .setFooter({ text: 'Whitelist System | Purpur-SMP' })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('request_whitelist')
            .setLabel('Demander la Whitelist')
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });

        await message.reply('✅ L\'embed de whitelist a été envoyé avec succès !');
    }
};