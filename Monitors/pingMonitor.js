const { Client, Message, PermissionsBitField} = require('discord.js');
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

// based on https://stackoverflow.com/questions/46009180/replace-a-string-after-specific-index-in-javascript-str-replacefrom-to-indexf
function replaceAfter(original, search, replace, from) {
    if (original.length > from) {
        return original.slice(0, from) + original.slice(from).replace(search, replace);
    }

    return original;
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


for (let ping of repeater) messageLogs[ping.purpose] = {};

/**
 * @description Looks pings and responds accordingly
 * @param {Client} discord The discord client
 * @param {Message} message 
 */
 async function messageCreate(discord, message) {
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
                            }, ping.timeout ?? 5000);

                            await logActivity(discord, "Bad Ping Role", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);
                        }

                        return true;
                    }

                    // check if the ping requires a verified role
                    if (ping.verify && ping.verify.length) {
                        if (message.member.roles.cache.map(r => r.id).filter(v => ping.verify.includes(v)).length === 0) {
                            await logActivity(discord, "Missing Verified Role", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);
                            
                            if (ping.errors.verify) {
                                const response = await message.reply({ content: ping.errors.verify });

                                setTimeout(async () => {
                                    try {
                                        if (response.deletable) await response.delete();
                                    } catch { /* don't care */ }
                                }, ping.timeout ?? 5000);
                            }

                            return true;
                        }
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
                        }, ping.timeout ?? 5000);

                        await logActivity(discord, "Wrong Channel", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);

                        return true;
                    }

                    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                        // member is not a mod, they may be ratelimited
                        // check if the user is ratelimited
                        // first part of this if is the per user logic, second part is when the config is setup for global ping
                        if (messageLogs[ping.purpose][message.member.user.id] || (ping.global && Object.keys(messageLogs[ping.purpose]).length > 0)) {
                            let originalPing;

                            if (ping.global) {
                                // modification for kobe
                                originalPing = Object.values(messageLogs[ping.purpose])[0];
                            } else {
                                // original logic
                                originalPing = messageLogs[ping.purpose][message.member.user.id];
                            }

                            const ms = (ping.rateLimit - (now - originalPing));

                            if (ms > 0) {
                                const minutes = Math.trunc(ms / 60000);
                    
                                const timeLeft = minutes > 1 ? "" + minutes + " minutes" : "about a minute";

                                const response = await message.reply({ content: `Please wait ${timeLeft} before pinging this role again` });
                                
                                setTimeout(async () => {
                                    try {
                                        if (response.deletable) await response.delete();
                                    } catch { /* don't care */ }
                                }, ping.timeout ?? 5000);
                                
                                await logActivity(discord, "Rate Limited", `**Username:** ${message.member.user.username}#${message.member.user.discriminator}\n**ID:** ${message.member.id}\n**Time Remaining:** ${ms}ms\nPinged <@&${ping.listenForRoleId}> in <#${message.channelId}>`);
    
                                return true;
                            }
                        }

                        messageLogs[ping.purpose][message.member.user.id] = now;
                    }

                    const messageContent = stripUrlFromMessage(message.content);

                    let sendableMessage;
                    
                    if (ping.message) {
                        sendableMessage = {
                            content: ping.message
                        };
                    } else {
                        sendableMessage = {
                            content: `**{user} is {role}**.  They said:\n\n{content}`
                        };
                    }

                    const userIndex = sendableMessage.content.indexOf("{user}");
                    const roleIndex = sendableMessage.content.indexOf("{role}");
                    const contentIndex = sendableMessage.content.indexOf("{content}");

                    let content = messageContent.substring(0, 1500);

                    let roles;

                    // normalize the roles
                    if (typeof ping.pingsRoleId === "string") {
                        roles = `<@&${ping.pingsRoleId}>`;
                    } else {
                        // assume this is an array
                        roles = [...ping.pingsRoleId].map(v => `<@&${v}>`).join(", ");

                        roles = replaceAfter(roles, ", ", ", or ", roles.lastIndexOf(", "));
                    }

                    let user = `<@${userId}>`;

                    // we need all permutations of these 3 variables
                    if (userIndex > -1 && roleIndex > -1 && contentIndex > -1) {
                        if (userIndex < roleIndex && roleIndex < contentIndex) {
                            // user role content
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                        } else if (userIndex < contentIndex && contentIndex < roleIndex) {
                            // user content role
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                        } else if (contentIndex < userIndex && userIndex < roleIndex) {
                            // content user role
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                        } else if (contentIndex < roleIndex && roleIndex < userIndex) {
                            // content role user
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                        } else if (roleIndex < contentIndex && contentIndex < userIndex) {
                            // role content user
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                        } else if (roleIndex < userIndex && userIndex < contentIndex) {
                            // role user content
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                        }
                    } else if (userIndex > -1 && roleIndex > -1) {
                        if (userIndex < roleIndex) {
                            // user role
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                        } else {
                            // role user
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                        }
                    } else if (userIndex > -1 && contentIndex > -1) {
                        if (userIndex < contentIndex) {
                            // user content
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                        } else {
                            // content user
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                        }
                    } else if (roleIndex > -1 && contentIndex > -1) {
                        if (roleIndex < contentIndex) {
                            // role content
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                        } else {
                            // content role
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                            sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                        }
                    } else if (userIndex > -1) {
                        // user
                        sendableMessage.content = replaceAfter(sendableMessage.content, "{user}", user, userIndex);
                    } else if (roleIndex > -1) {
                        // role
                        sendableMessage.content = replaceAfter(sendableMessage.content, "{role}", roles, roleIndex);
                    } else if (contentIndex > -1) {
                        // content
                        sendableMessage.content = replaceAfter(sendableMessage.content, "{content}", content, contentIndex);
                    }

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

                    return true;
                }
            }
        } else if (message.mentions.repliedUser && message.mentions.repliedUser.id === discord.user.id) {
            await message.reply({ content: snarkyReply[Math.floor(Math.random() * snarkyReply.length)] });
            return true;
        }
    } catch (err) {
        console.log(`Error when responding: ${err.toString()}`);
    }
 }

module.exports = {
    messageCreate
};
