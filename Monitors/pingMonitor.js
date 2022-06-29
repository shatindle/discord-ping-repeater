const DiscordApi = require('discord.js');
const { stripUrlFromMessage } = require("../data/urlParser");
const { repeater } = require("../settings.json");
const { searchGear } = require("../data/gearRepo");

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

setInterval(expire, 60 * 1000);

const snarkyReply = [
    "Meow! (oops, w‌‌rong s‌‌ub)",
    "Meow! (I'm trying my hardest, ok)",
    "Meow! (are you talkin' to me?)",
    "Meow! (I'm pretty sure that's actually what you wanted though)",
    "Meow! (shut)",
    "Meow! (I meant to do that)",
    "Meow! (banana phone)",
    "Meow! (I have displeased the great zapfish)",
    "Meow! (oops, I did it again)",
    "Meow! (I'm not a mind reader, you know)"
];
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

                            const messageContent = stripUrlFromMessage(message.content);

                            const sendableMessage = {
                                content: `**<@${userId}> is <@&${ping.pingsRoleId}>**.  They said:\n\n${messageContent.substring(0, 1500)}`
                            };

                            let imageToSend;

                            if (ping.imageRepo && (!message.attachments || message.attachments.size === 0)) {

                                if (ping.imageRepo === "gear") {
                                    imageToSend = await searchGear(messageContent);
    
                                    if (imageToSend)
                                        sendableMessage.files = [{
                                            attachment: imageToSend
                                        }];
                                }
                            }

                            // alert the media!
                            await message.channel.send(sendableMessage);
                        }
                    }
                }
            } else if (message.mentions.repliedUser && message.mentions.repliedUser.id === discord.user.id) {
                await message.reply({ content: snarkyReply[Math.floor(Math.random() * snarkyReply.length)] });
            }
        } catch (err) {
            console.log(`Error when responding: ${err.toString()}`);
        }
    });
 }

module.exports = monitor;
