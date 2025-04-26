const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
require('dotenv').config();

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent]
});

// On enveloppe tout dans une fonction async
(async () => {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });


    client.on('messageCreate', async message => {
        if (message.content === '!setup-tickets') {
            const embed = new EmbedBuilder()
                .setTitle('Support Tickets')
                .setDescription('Clique sur le bouton pour ouvrir un ticket.')
                .setColor('#CE34CE');

            const button = new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Créer un ticket')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);

            await message.channel.send({ embeds: [embed], components: [row] });
        }
    });

})();