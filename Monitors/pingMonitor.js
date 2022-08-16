const DiscordApi = require('discord.js');
const { stripUrlFromMessage } = require("../data/urlParser");
const { repeater } = require("../settings.json");
const { searchGear } = require("../data/gearRepo");
const logActivity = require("../data/logActivity");

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

        try {
            if (message.mentions.roles.size > 0) {
                for (let ping of repeater) {
                    // check if this message contains a ping
                    if (message.mentions.roles.has(ping.listenForRoleId)) {
                        // check if this role has a proxy
                        if (!ping.pingsRoleId) {
                            if (ping.errors.noping) {
                                const response = await message.reply({ content: ping.errors.noping });

                                setTimeout(async () => {
                                    try {
                                        if (response.deletable) await response.delete();
                                    } catch { /* don't care */ }
                                }, 5000);
    
                                await logActivity(discord, "Bad Ping Role", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);
                            }

                            return;
                        }
                        
                        // check if the channel they asked in is appropriate
                        if (ping.channels && ping.channels.length > 0 && ping.channels.indexOf(message.channelId) === -1) {
                            // they asked in the wrong channel
                            let channelList = "";

                            if (ping.channels.length === 1) channelList = `<#${ping.channels[0]}>`;
                            else if (ping.channels.length === 2) channelList = `<#${ping.channels[0]}> or <#${ping.channels[1]}>`;
                            else {
                                ping.channels.forEach((c, i) => {
                                    if (i === ping.channels.length - 1) channelList += `, or <#${c}>`;
                                    else if (i === 0) channelList += `<#${c}>`;
                                    else channelList += `, <#${c}>`;
                                });
                            }
                            let channelMessage = ping.errors.channels.replace("{channels}", channelList);

                            const response = await message.reply({ content: channelMessage });

                            setTimeout(async () => {
                                try {
                                    if (response.deletable) await response.delete();
                                } catch { /* don't care */ }
                            }, 5000);

                            await logActivity(discord, "Wrong Channel", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);

                            return;
                        }

                        if (!message.member.permissions.has(DiscordApi.Permissions.FLAGS.MANAGE_MESSAGES)) {
                            // member is not a mod, they may be ratelimited
                            // check if the user is ratelimited
                            if (messageLogs[ping.purpose][message.member.user.id]) {
                                const ms = (ping.rateLimit - (now - messageLogs[ping.purpose][message.member.user.id]));

                                if (ms > 0) {
                                    const minutes = Math.trunc(ms / 60000);
                       
                                    const timeLeft = minutes > 1 ? "" + minutes + " minutes" : "about a minute";
    
                                    const response = await message.reply({ content: `Please wait ${timeLeft} before pinging this role again` });
                                    
                                    setTimeout(async () => {
                                        try {
                                            if (response.deletable) await response.delete();
                                        } catch { /* don't care */ }
                                    }, 5000);
                                    
                                    await logActivity(discord, "Rate Limited", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\n**Time Remaining:** ${ms}ms\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);
        
                                    return;
                                }
                            }
    
                            messageLogs[ping.purpose][message.member.user.id] = now;
                        }
    
                        const messageContent = stripUrlFromMessage(message.content);

                        const sendableMessage = {
                            content: `**<@${userId}> is <@&${ping.pingsRoleId}>**.  They said:\n\n${messageContent.substring(0, 1500)}`
                        };

                        let imageToSend;

                        if (ping.imageRepo && (!message.attachments || message.attachments.size === 0)) {

                            if (ping.imageRepo === "gear") {
                                imageToSend = await searchGear(messageContent);

                                if (imageToSend && imageToSend.length)
                                    sendableMessage.files = imageToSend.map(t => {
                                        return {
                                            attachment: t
                                        }
                                    });
                            }
                        }

                        // alert the media!
                        await message.channel.send(sendableMessage);

                        return;
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
