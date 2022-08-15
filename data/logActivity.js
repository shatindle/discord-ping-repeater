const { MessageEmbed } = require("discord.js");
const { spamChannel } = require("../settings.json");

async function logActivity(client, action, activity) {
    try {
        let channel = client.channels.cache.get(spamChannel);

        if (!channel || !channel.send)
            channel = client.channels.fetch(spamChannel);

        const message = new MessageEmbed()
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