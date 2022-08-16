const { Client, Intents } = require('discord.js');
const { token } = require('./settings.json');
const { messageCreate:messageCreatePing } = require("./Monitors/pingMonitor");
const { messageCreate:messageCreateInvite, messageUpdate:messageUpdateInvite } = require("./Monitors/inviteMonitor");

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ], 
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'] 
});

client.on('messageCreate', async (message) => {
    // if (await messageCreateInvite(client, message)) return;
    if (await messageCreatePing(client, message)) return;
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (await messageUpdateInvite(client, oldMessage, newMessage)) return;
})

client.once('ready', async () => {
    await require("./Monitors/status")(client);
});


// login to discord - we should auto reconnect automatically
client.login(token);