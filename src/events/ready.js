const util = require('minecraft-server-util');
require('dotenv').config();

const SERVER_IP = process.env.SERVER_IP;
const SERVER_PORT =  parseInt(process.env.SERVER_PORT);
const VOICE_CHANNEL_ID = process.env.CONNECTED_VOICE_CHANNEL_ID;

module.exports = (client) => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    const updateStatus = async () => {
        try {
            const response = await util.status(SERVER_IP, SERVER_PORT);
            const playerCount = response.players.online;



            client.user.setPresence({
                activities: [{ name: `Purpur-SMP avec ${playerCount} joueurs`}],
            });

            const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
            if (channel) {
                await channel.setName(` ${playerCount} connectés`);
            }

        } catch (error) {
            console.error('❌ Impossible de récupérer le statut du serveur:', error);
            client.user.setPresence({
                activities: [{ name: 'Serveur hors ligne', type: 'WATCHING' }],
                status: 'dnd'
            });
        }
    };

    // Met à jour le statut toutes les 30 secondes
    updateStatus();
    setInterval(updateStatus, 30000);
};