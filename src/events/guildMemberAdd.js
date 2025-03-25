const { Events } = require('discord.js');
const { buildBanner } = require('./join/bannerBuilder.js');
require('dotenv').config();

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member) {
        try {
            const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

            if (welcomeChannel) {
                const buffer = await buildBanner('./index.html', member.user.displayAvatarURL({ format: 'png', size: 2048 }), member.user.globalName);
                console.log(Buffer.isBuffer(buffer));

                welcomeChannel.send({
                    content: `<@${member.id}>`,
                    files: [{ attachment: buffer, name: 'screenshot.png' }]
                });
            } else {
                console.log(`Channel with ID ${welcomeChannelId} not found.`);
            }

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