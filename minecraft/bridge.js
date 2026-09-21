const mineflayer = require('mineflayer');
const { WebhookClient } = require('discord.js');

const MC_HOST = process.env.MC_HOST || 'mc.HylexMC.net';
const MC_PORT = Number(process.env.MC_PORT || 25565);
const MC_VERSION = process.env.MC_VERSION || '1.8.9';
const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD;
const MC_AUTH = process.env.MC_AUTH || 'microsoft';

const DISCORD_GC_CHANNEL_ID =
    process.env.DISCORD_GC_CHANNEL_ID || '1544502497798787092';

const MC_WEBHOOK_URL = process.env.MC_WEBHOOK_URL;

const IGNORED_DISCORD_USER_ID = '1545616456568275024';
const IGNORED_MINECRAFT_NICK = 'EME_CHAT';

if (!MC_USERNAME) {
    console.error('[MC] Brak MC_USERNAME w .env');
}

if (!MC_PASSWORD) {
    console.error('[MC] Brak MC_PASSWORD w .env');
}

if (!MC_WEBHOOK_URL) {
    console.error('[MC] Brak MC_WEBHOOK_URL w .env');
}

let mcBot = null;
let reconnectTimer = null;
let starting = false;

let loginSent = false;

const webhook = MC_WEBHOOK_URL
    ? new WebhookClient({ url: MC_WEBHOOK_URL })
    : null;

function cleanMinecraftText(text) {
    return String(text || '')
        .replace(/§[0-9a-fk-or]/gi, '')
        .trim();
}

function resetLoginState() {
    loginSent = false;
}

function sendLogin() {
    if (!mcBot) return;

    if (loginSent) {
        return;
    }

    if (!MC_PASSWORD) {
        console.error(
            '[MC] Brak MC_PASSWORD w .env — nie można wykonać /login.'
        );
        return;
    }

    try {
        mcBot.chat(`/login ${MC_PASSWORD}`);

        loginSent = true;

        console.log('[MC] Wysłano /login z hasłem z .env.');
    } catch (error) {
        console.error(
            '[MC] Nie udało się wysłać /login:',
            error
        );
    }
}

function startMinecraft() {
    if (starting || mcBot) return;
    if (!MC_USERNAME) return;

    starting = true;

    resetLoginState();

    console.log(
        `[MC] Łączenie z ${MC_HOST}:${MC_PORT}...`
    );

    const options = {
        host: MC_HOST,
        port: MC_PORT,
        username: MC_USERNAME,
        version: MC_VERSION,
        auth: MC_AUTH
    };

    if (MC_PASSWORD) {
        options.password = MC_PASSWORD;
    }

    mcBot = mineflayer.createBot(options);

    mcBot.on('messagestr', async (rawMessage) => {
        const message = cleanMinecraftText(rawMessage);

        if (!message) return;

        console.log(`[MC] Server: ${message}`);

        const lowerMessage = message.toLowerCase();

        const loginRequired =
            lowerMessage.includes('/login') ||
            lowerMessage.includes('please login') ||
            lowerMessage.includes('please log in') ||
            lowerMessage.includes('login required') ||
            lowerMessage.includes('log in') ||
            lowerMessage.includes('zaloguj');

        if (loginRequired && !loginSent) {
            console.log(
                '[MC] Wykryto komunikat logowania. Wysyłam /login...'
            );

            sendLogin();
        }


        if (!message.startsWith('[GC]')) return;

        const match = message.match(
            /^\[GC\]\s*([^:>]+?)\s*[:>]\s*(.+)$/s
        );

        if (!match) {
            console.log(
                `[MC] Wykryto [GC], ale nie udało się odczytać nicku: ${message}`
            );

            return;
        }

        const nick = match[1].trim();
        const content = match[2].trim();

        if (
            nick.toLowerCase() ===
            IGNORED_MINECRAFT_NICK.toLowerCase()
        ) {
            return;
        }

        if (!nick || !content || !webhook) return;

        try {
            await webhook.send({
                content: `**[GC] ${nick}:** \`${content}\``,
                username: nick.slice(0, 80),
                avatarURL:
                    `https://mc-heads.net/avatar/${encodeURIComponent(nick)}`,
                allowedMentions: {
                    parse: []
                }
            });

            console.log(
                `[MC → Discord] ${nick}: ${content}`
            );
        } catch (error) {
            console.error(
                '[MC → Discord] Błąd webhooka:',
                error
            );
        }
    });

    mcBot.once('spawn', () => {
        starting = false;

        console.log(
            `[MC] Bot wszedł na ${MC_HOST}`
        );
    });

    mcBot.on('kicked', (reason) => {
        console.log(
            '[MC] Bot został wyrzucony:',
            reason
        );

        resetLoginState();
    });

    mcBot.on('error', (error) => {
        console.error(
            '[MC] Błąd:',
            error.message
        );
    });

    mcBot.on('end', () => {
        console.log(
            '[MC] Połączenie zakończone. Ponawiam za 10 sekund...'
        );

        resetLoginState();

        mcBot = null;
        starting = false;

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;

            startMinecraft();
        }, 10000);
    });
}

function attachDiscordBridge(client) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        if (
            message.channel.id !==
            DISCORD_GC_CHANNEL_ID
        ) {
            return;
        }

        if (
            message.author.id ===
            IGNORED_DISCORD_USER_ID
        ) {
            return;
        }

        if (!mcBot || !mcBot.player) {
            console.log(
                '[Discord → MC] Bot Minecraft nie jest obecnie połączony.'
            );

            return;
        }

        const content = message.content.trim();

        if (!content) return;

        const username = message.author.username;

        const safeContent = content
            .replace(/[\r\n]+/g, ' ')
            .trim();

        try {
            mcBot.chat(
                `/gc [DC] ${username}: ${safeContent}`
            );

            console.log(
                `[Discord → MC] ${username}: ${safeContent}`
            );
        } catch (error) {
            console.error(
                '[Discord → MC] Błąd wysyłania:',
                error
            );
        }
    });

    startMinecraft();
}

module.exports = {
    attachDiscordBridge,
    startMinecraft
};
