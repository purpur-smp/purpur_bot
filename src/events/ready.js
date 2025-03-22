const util = require('minecraft-server-util');

const SERVER_IP = 'localhost'; // Remplacer par l'IP du serveur Minecraft
const SERVER_PORT = 25565;

module.exports = (client) => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    const updateStatus = async () => {
        try {
            const response = await util.status(SERVER_IP, SERVER_PORT);
            const playerCount = response.players.online;



            client.user.setPresence({
                activities: [{ name: `Purpur-SMP avec ${playerCount} joueurs`}],
            });

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