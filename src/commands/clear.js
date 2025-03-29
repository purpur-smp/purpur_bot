const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Deletes a certain number of messages in the current channel.')
        .addIntegerOption(option =>
            option
                .setName('number')
                .setDescription('Number of messages to delete (1-100).')
                .setRequired(true)
        ),
    async execute(interaction) {
        const number = interaction.options.getInteger('number');

        // Check if the user has permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: "🚫 You don't have permission to manage messages.",
                ephemeral: true,
            });
        }

        // Check if the number of messages is valid
        if (number < 1 || number > 100) {
            return interaction.reply({
                content: '🚫 Please specify a number between 1 and 100.',
                ephemeral: true,
            });
        }

        // Try to delete the messages
        try {
            const deleted = await interaction.channel.bulkDelete(number, true);
            return interaction.reply({
                content: `✅ ${deleted.size} message(s) deleted.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            return interaction.reply({
                content: '❌ An error occurred while deleting the messages.',
                ephemeral: true,
            });
        }
    },
};