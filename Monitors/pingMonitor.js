const DiscordApi = require('discord.js');
const { repeater } = require("../settings.json");

const messageLogs = {};

function expire() {
    for (let ping of repeater) {
        let expired = [];
        let expirationTime = new Date().valueOf() - ping.rateLimit;

        for (const [key, value] of Object.entries(messageLogs[ping.purpose])) {
            if (value < expirationTime) {
                expired.push(key);
            }
        }

        expired.forEach(k => delete messageLogs[ping.purpose][k]);
    }
}

const expireTimer = setInterval(expire, 60 * 1000);

/**
 * @description Looks for nitro/steam scams and removes them
 * @param {DiscordApi.Client} discord The discord client
 */
 function monitor(discord) {
    for (let ping of repeater) 
        messageLogs[ping.purpose] = {};

    discord.on('messageCreate', 
    /**
     * 
     * @param {DiscordApi.Message} message 
     * @returns 
     */
    async (message) => {
        // ignore posts from bots
        if (message.author.bot) return;
        const userId = message.member.id;
        const now = new Date().valueOf();

        let responded = false;

        try {
            if (message.mentions.roles.size > 0) {
                for (let ping of repeater) {
                    // check if this message contains a ping
                    if (message.mentions.roles.has(ping.listenForRoleId)) {
                        if (!message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) {
                            // member is not a mod, they may be ratelimited
                            // check if the user is ratelimited
                            if (messageLogs[ping.purpose][message.member.user.id]) {
                                if (!responded) {
                                    responded = true;
    
                                    const minutes = Math.trunc((ping.rateLimit - (now - messageLogs[ping.purpose][message.member.user.id])) / 60000);
                       
                                    const timeLeft = minutes > 1 ? "" + minutes + " minutes" : "about a minute";
    
                                    const response = await message.reply({ content: `Please wait ${timeLeft} before pinging this role again` });
                                    
                                    setTimeout(async () => {
                                        if (response.deletable)
                                            await response.delete();
                                    }, 5000);
                                }
    
                                continue;
                            }
    
                            messageLogs[ping.purpose][message.member.user.id] = now;
                        }
    
                        if (!responded) {
                            responded = true;
    
                            // alert the media!
                            await message.channel.send(
                                `**<@${userId}> is looking for <@&${ping.pingsRoleId}>**  They said:\n\n${message.content.substring(0, 1500)}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`Error when responding: ${err.toString()}`);
        }
    });
 }

module.exports = monitor;
