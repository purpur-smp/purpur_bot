const util = require('minecraft-server-util');

const SERVER_IP = 'ton-ip-ou-localhost'; // Remplace par l'IP du serveur Minecraft
const SERVER_PORT = 25565; // Change si ton port est différent

module.exports = (client) => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    const updateStatus = async () => {
        try {
            const response = await util.status(SERVER_IP, SERVER_PORT);
            const playerCount = response.players.online;

            client.user.setPresence({
                activities: [{ name: `Regarde ${playerCount} joueurs`, type: 'WATCHING' }],
                status: 'online'
            });

        } catch (error) {
            console.error('❌ Impossible de récupérer le statut du serveur:', error);
            client.user.setPresence({
                activities: [{ name: 'Serveur hors ligne', type: 'WATCHING' }],
                status: 'dnd'
            });
        }
    };

    // Met à jour le statut toutes les 60 secondes
    updateStatus();
    setInterval(updateStatus, 60000);
};