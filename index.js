const { Client, Intents } = require('discord.js');
const { token } = require('./settings.json');

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

client.once('ready', async () => {
    require("./Monitors/pingMonitor")(client);
    await require("./Monitors/status")(client);
});


// login to discord - we should auto reconnect automatically
client.login(token);