const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { token, invites } = require('./settings.json');
const { messageCreate:messageCreatePing } = require("./Monitors/pingMonitor");
const { messageCreate:messageCreateInvite, messageUpdate:messageUpdateInvite } = require("./Monitors/inviteMonitor");

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ], 
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ] 
});

client.on('messageCreate', async (message) => {
    if (!invites.disabled && await messageCreateInvite(client, message)) return;
    if (await messageCreatePing(client, message)) return;
});

if (!invites.disabled) {
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (await messageUpdateInvite(client, oldMessage, newMessage)) return;
    });
}


client.once('ready', async () => {
    await require("./Monitors/status")(client);
});


// login to discord - we should auto reconnect automatically
client.login(token);