const { Client, User, Message, Permissions, PermissionsBitField } = require('discord.js');
const { extractUrlsFromContent, getServerIdFromInvite } = require("../data/urlParser");
const { invites } = require("../settings.json");
const logActivity = require("../data/logActivity");

/**
 * @description Checks if there are any links, and if so, if they happen to be Discord links
 * @param {String} content The message content to evaluate
 */
async function allowedLinks(content, thisGuildId) {
    const urlsFound = extractUrlsFromContent(content);

    if (urlsFound.length > 0) {
        for (var url of urlsFound) {
            let linkServer = await getServerIdFromInvite(url);
    
            if (linkServer) {
                if (linkServer === thisGuildId) return true;
                if (invites && invites.allowed && invites.allowed.indexOf(linkServer) === -1) return false;
            }
        }
    }

    return true;
}

/**
 * 
 * @param {Client} discord 
 * @param {Message} message 
 * @param {User} user 
 * @param {String} userId 
 * @param {String} channelId 
 * @param {String} content 
 */
async function removeMessage(discord, message, user, userId, channelId, content) {
    await logActivity(discord, "Forbidden Invite", `**Username:** ${user}\n**ID:** ${userId}\n**Channel:** <#${channelId}>\n**__Message__**\n\n${content}`);

    const response = await message.reply({ content: `Unapproved external invites are not allowed in the server.  Please see the rules.` });
                                    
    setTimeout(async () => {
        try {
            if (response.deletable) await response.delete();
        } catch { /* don't care */ }
    }, 5000);

    try {
        if (message.deletable) await message.delete();
    } catch { /* don't care */ }
}

/**
 * @description Looks discord invites and removes them if they aren't in the whitelist
 * @param {Client} discord The discord client
 * @param {Message} message
 */
async function messageCreate(discord, message) {
    // ignore messages from mods and bots
    if (message.author.bot) return;
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    const user = `${message.member.user.username}#${message.member.user.discriminator}`;
    const userId = message.member.id;
    const channelId = message.channelId;
    const content = message.content;
    const guildId = message.guildId;

    try {
        if (!await allowedLinks(content, guildId)) {
            await removeMessage(discord, message, user, userId, channelId, content);
            return true;
        }
    } catch (err) {
        console.log(`Error managing invites: ${err.toString()}`);
    }
}

/**
 * 
 * @param {Client} discord 
 * @param {Message} oldMessage 
 * @param {Message} newMessage 
 * @returns 
 */
async function messageUpdate(discord, oldMessage, newMessage) {
    const message = newMessage;

    // ignore messages from mods and bots
    if (message.author.bot) return;
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    const user = `${message.member.user.username}#${message.member.user.discriminator}`;
    const userId = message.member.id;
    const channelId = message.channelId;
    const content = message.content;
    const guildId = message.guildId;

    try {
        if (!await allowedLinks(content, guildId)) {
            await removeMessage(discord, message, user, userId, channelId, content);
            return true;
        }
    } catch (err) {
        console.log(`Error managing invites: ${err.toString()}`);
    }
}

module.exports = {
    messageCreate, 
    messageUpdate
};