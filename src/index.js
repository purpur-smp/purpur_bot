require('dotenv').config();

const fs = require("fs");
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const mysql = require('mysql2');
const tempVoiceHandler = require('./events/tempVoiceHandler');
const path = require("node:path");
const messageCreate = require('./events/whitelistMessageCreate');

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Discord client configuration
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const rest = new REST({ version: '10' }).setToken(token);

client.on('messageCreate', (message) => messageCreate(client, message));
// Initialize collections
client.commands = new Collection();
const commandArray = [];


// Load command files from "commands"
const commandFiles = fs.readdirSync(__dirname + "/commands/").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(__dirname + `/commands/${file}`);
    console.log(`${file} loaded`);
    client.commands.set(command.data.name, command);
    commandArray.push(command.data.toJSON());
}

client.once('ready', () => require(__dirname + '/events/ready')(client));

const commandSubFolders = fs.readdirSync(__dirname + "/commands/").filter(folder => !folder.endsWith(".js"));
for (const folder of commandSubFolders) {
    const subCommandFiles = fs.readdirSync(__dirname + `/commands/${folder}/`).filter(file => file.endsWith(".js"));
    for (const file of subCommandFiles) {
        const command = require(__dirname + `/commands/${folder}/${file}`);
        console.log(`${file} loaded from folder ${folder}`);
        client.commands.set(command.data.name, command);
        commandArray.push(command.data.toJSON());
    }
}

// Load event files from "events"
const eventFiles = fs.readdirSync(__dirname + "/events/").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const event = require(__dirname + `/events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// MySQL connection configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});
module.exports = db;

// Test the connection
db.connect((err) => {
    if (err) {
        console.error("❌ Error connecting to the database:", err.message);
        return;
    }
    console.log("✅ Connected to the MySQL database!");
});



// Properly close the connection (optional)
process.on('exit', () => db.end());

// Register slash commands with the REST API
client.once("ready", async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
     try {
        const commands = commandFiles.map(file => {
            console.log(`[INDEX] : Enregistrement de la commande ${file}`);

            const command = require(`./commands/${file}`);
            client.commands.set(command.data.name, command);
            return command.data.toJSON();
        });

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });

        console.log('[INDEX] : Toutes les commandes ont été enregistrées avec succès.');
    } catch (error) {
        console.error('[INDEX] : Erreur lors de l\'enregistrement des commandes:', error);
    }
});

// Handle interactions (slash commands)
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`⚠️ Command "${interaction.commandName}" not found.`);
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`❌ Error executing command "${interaction.commandName}":`, error);
        await interaction.reply({
            content: "⚠️ An error occurred while executing this command.",
            ephemeral: true,
        });
    }
});

// Handle voice state updates
client.on('voiceStateUpdate', tempVoiceHandler);

// Bot login
client.login(token).catch(console.error);
