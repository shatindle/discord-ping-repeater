const { EmbedBuilder } = require("discord.js");
const { spamChannel } = require("../settings.json");

async function logActivity(client, action, activity) {
    try {
        let channel = client.channels.cache.get(spamChannel);

        if (!channel || !channel.send)
            channel = await client.channels.fetch(spamChannel);

        const message = new EmbedBuilder()
            .setColor("#d3c3df")
            .setTitle(action)
            .setDescription(activity)
            .setTimestamp();

        await channel.send({ embeds: [message] });
    } catch (err) {
        console.log(`Error logging activity: ${err}`);
    }
}

module.exports = logActivity;