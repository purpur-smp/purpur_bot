const mcs = require('node-mcstatus');
require('dotenv').config();

const SERVER_IP = process.env.MC_SERVER_IP;
const SERVER_PORT = parseInt(process.env.MC_SERVER_PORT);
const VOICE_CHANNEL_ID = process.env.CONNECTED_VOICE_CHANNEL_ID;

module.exports = (client) => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    const updateStatus = async () => {
        try {
            const options = { query: true };
            const result = await mcs.statusJava(SERVER_IP, SERVER_PORT, options);

            if (result.online) {
                const playerCount = result.players.online;

                console.log("Check made, players online: " + playerCount);

                client.user.setPresence({
                    activities: [{ name: `Purpur-SMP avec ${playerCount} joueurs`, type: 'WATCHING' }],
                });

                const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
                if (channel) {
                    await channel.setName(`${playerCount} connectés`);
                }
            } else {
                client.user.setPresence({
                    activities: [{ name: 'Serveur hors ligne', type: 'WATCHING' }],
                    status: 'dnd'
                });
            }
        } catch (error) {
            console.error('❌ Impossible de récupérer le statut du serveur:', error);
            client.user.setPresence({
                activities: [{ name: 'Serveur indisponible', type: 'WATCHING' }],
                status: 'dnd'
            });
        }
    };

    updateStatus();
    setInterval(updateStatus, 30000);
};
