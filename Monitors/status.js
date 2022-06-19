const DiscordApi = require('discord.js');

/**
 * @description Updates the server count
 * @param {DiscordApi.Client} discord The discord client
 */
 async function monitor(discord) {
    await discord.user.setActivity(`marco polo`);
 }

 module.exports = monitor;