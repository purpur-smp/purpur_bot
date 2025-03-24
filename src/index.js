require('dotenv').config();

const fs = require("fs");
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const mysql = require('mysql2');
const tempVoiceHandler = require('./events/tempVoiceHandler');

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

// Initialize collections
client.commands = new Collection();
const commandArray = [];

// Load command files from "commands"
const commandFiles = fs.readdirSync("./commands/").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    console.log(`${file} loaded`);
    client.commands.set(command.data.name, command);
    commandArray.push(command.data.toJSON());
}

client.once('ready', () => require('./events/ready')(client));

// Load subfolders of commands in "commands"
const commandSubFolders = fs.readdirSync("./commands/").filter(folder => !folder.endsWith(".js"));
for (const folder of commandSubFolders) {
    const subCommandFiles = fs.readdirSync(`./commands/${folder}/`).filter(file => file.endsWith(".js"));
    for (const file of subCommandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        console.log(`${file} loaded from folder ${folder}`);
        client.commands.set(command.data.name, command);
        commandArray.push(command.data.toJSON());
    }
}

// Load event files from "events"
const eventFiles = fs.readdirSync("./events/").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// MySQL connection configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST,       // MySQL server address or domain
    user: process.env.DB_USER,       // MySQL username
    password: process.env.DB_PASSWORD, // MySQL password
    database: process.env.DB_NAME,   // Database name
    port: process.env.DB_PORT        // MySQL port (default is 3306)
});

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