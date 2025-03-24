const { Events } = require('discord.js');
require('dotenv').config();

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        try {
            // Get the welcome channel
            const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

            if (welcomeChannel) {
                welcomeChannel.send(`✨ Hello ${member} ! Bienvenue sur **PurpurSMP** ! Merci d'aller lire <#1351671419313979393>! ✨`);
            } else {
                console.log(`Channel with ID ${welcomeChannelId} not found.`);
            }

            // Get and assign the role
            const welcomeRoleId = process.env.WELCOME_ROLE_ID;
            const welcomeRole = member.guild.roles.cache.get(welcomeRoleId);

            if (welcomeRole) {
                await member.roles.add(welcomeRole);
                console.log(`✅ Role "${welcomeRole.name}" assigned to ${member.user.tag}.`);
            } else {
                console.log(`❌ Role with ID ${welcomeRoleId} not found.`);
            }
        } catch (error) {
            console.error('Error assigning the role or sending the message:', error);
        }
    },
};