const fs = require('fs');
const path = require('path');

const BAD_WORDS_PATH = path.join(
    __dirname,
    '..',
    'data',
    'BadWords.json'
);

const WARNING_DELETE_AFTER = 5000;

const ALLOWED_SERVER_IDS = [
    '1418364826165444621',
    '805383033900367902',
    '859870732985040906'
];

const INVITE_CACHE_TTL = 10 * 60 * 1000;

const inviteCache = new Map();


function loadBadWords() {
    try {
        if (!fs.existsSync(BAD_WORDS_PATH)) {
            console.error(
                '[AutoMod] BadWords.json does not exist.'
            );

            return [];
        }

        const data = fs.readFileSync(
            BAD_WORDS_PATH,
            'utf8'
        );

        const parsed = JSON.parse(data);

        if (!Array.isArray(parsed)) {
            console.error(
                '[AutoMod] BadWords.json must be an array.'
            );

            return [];
        }

        return parsed
            .filter(word =>
                typeof word === 'string' &&
                word.trim().length > 0
            )
            .map(word => word.trim());

    } catch (error) {
        console.error(
            '[AutoMod] Failed to load BadWords.json:',
            error
        );

        return [];
    }
}

let badWords = loadBadWords();

const CHARACTER_MAP = {
    '4': 'a',
    '@': 'a',

    '8': 'b',

    '(': 'c',

    '3': 'e',

    '6': 'g',

    '#': 'h',

    '1': 'i',
    '!': 'i',
    '|': 'i',

    '0': 'o',

    '$': 's',
    '5': 's',

    '7': 't',

    '2': 'z'
};

const HOMOGLYPHS = {
    'а': 'a',
    'А': 'a',

    'е': 'e',
    'Е': 'e',

    'і': 'i',
    'І': 'i',

    'о': 'o',
    'О': 'o',

    'с': 'c',
    'С': 'c',

    'ѕ': 's',
    'Ѕ': 's',

    'һ': 'h',
    'Н': 'h',

    'ј': 'j',
    'Ј': 'j',

    'к': 'k',
    'К': 'k',

    'м': 'm',
    'М': 'm',

    'р': 'p',
    'Р': 'p',

    'х': 'x',
    'Х': 'x',

    'у': 'y',
    'У': 'y'
};

function normalizeText(text) {
    let normalized = String(text || '')
        .normalize('NFKD')
        .toLowerCase();

    normalized = normalized.replace(
        /[\u200B-\u200D\uFEFF\u2060]/g,
        ''
    );

    normalized = normalized
        .split('')
        .map(char =>
            HOMOGLYPHS[char] || char
        )
        .join('');

    normalized = normalized
        .split('')
        .map(char =>
            CHARACTER_MAP[char] || char
        )
        .join('');

    normalized = normalized.replace(
        /[\u0300-\u036f]/g,
        ''
    );

    normalized = normalized.replace(
        /[^\p{L}\p{N}]+/gu,
        ''
    );

    return normalized;
}

function containsBadWord(content) {
    const normalizedContent =
        normalizeText(content);

    if (!normalizedContent) {
        return null;
    }

    for (const word of badWords) {
        const normalizedWord =
            normalizeText(word);

        if (!normalizedWord) {
            continue;
        }

        if (
            normalizedContent.includes(
                normalizedWord
            )
        ) {
            return word;
        }
    }

    return null;
}

function extractDiscordInvites(content) {
    const invites = [];

    const inviteRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

    let match;

    while (
        (match = inviteRegex.exec(
            String(content || '')
        )) !== null
    ) {
        const code =
            match[1].toLowerCase();

        if (!invites.includes(code)) {
            invites.push(code);
        }
    }

    return invites;
}

async function getInviteFromDiscordAPI(
    inviteCode
) {
    const code =
        String(inviteCode || '')
            .trim()
            .toLowerCase();

    if (!code) {
        return null;
    }

    const cached =
        inviteCache.get(code);

    if (cached) {
        if (
            Date.now() - cached.timestamp
            < INVITE_CACHE_TTL
        ) {
            return cached.data;
        }

        inviteCache.delete(code);
    }

    try {
        const response = await fetch(
            `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=false`,
            {
                method: 'GET',
                headers: {
                    'Authorization':
                        `Bot ${process.env.DISCORD_TOKEN}`,
                    'User-Agent':
                        'EME-GUILD-AutoMod/1.0'
                }
            }
        );

        if (!response.ok) {
            console.warn(
                `[AutoMod] Discord API returned ${response.status} for invite ${code}.`
            );

            inviteCache.set(code, {
                data: null,
                timestamp: Date.now()
            });

            return null;
        }

        const data =
            await response.json();

        inviteCache.set(code, {
            data,
            timestamp: Date.now()
        });

        return data;

    } catch (error) {
        console.error(
            `[AutoMod] Discord API error while checking invite ${code}:`,
            error.message
        );

        return null;
    }
}

async function isInviteAllowed(
    message,
    inviteCode
) {
    const invite =
        await getInviteFromDiscordAPI(
            inviteCode
        );

    if (!invite) {
        console.warn(
            `[AutoMod] Could not resolve invite ${inviteCode}. Allowing message.`
        );

        return true;
    }

    const targetGuildId =
        invite.guild?.id;

    if (!targetGuildId) {
        console.warn(
            `[AutoMod] Discord API did not return guild.id for invite ${inviteCode}.`
        );

        return true;
    }

    console.log(
        `[AutoMod] Invite ${inviteCode} belongs to server ${targetGuildId}.`
    );


    if (
        targetGuildId ===
        message.guild.id
    ) {
        console.log(
            `[AutoMod] Allowed: invite belongs to current server.`
        );

        return true;
    }


    if (
        ALLOWED_SERVER_IDS.includes(
            targetGuildId
        )
    ) {
        console.log(
            `[AutoMod] Allowed: server ${targetGuildId} is whitelisted.`
        );

        return true;
    }


    console.log(
        `[AutoMod] BLOCKED: server ${targetGuildId} is not whitelisted.`
    );

    return false;
}


async function deleteAndWarn(
    message,
    reason
) {
    try {
        if (message.deletable) {
            await message.delete();
        }
    } catch (error) {
        console.error(
            '[AutoMod] Failed to delete message:',
            error.message
        );
    }

    try {
        const warning =
            await message.channel.send({
                content:
                    `<:90616bin:1543612412488454144> ${message.author}, ${reason}`,

                allowedMentions: {
                    users: [
                        message.author.id
                    ]
                }
            });

        setTimeout(
            async () => {
                try {
                    if (warning.deletable) {
                        await warning.delete();
                    }
                } catch {}
            },
            WARNING_DELETE_AFTER
        );

    } catch (error) {
        console.error(
            '[AutoMod] Failed to send warning:',
            error.message
        );
    }
}


let lastBadWordsMTime = 0;

function refreshBadWordsIfNeeded() {
    try {
        if (!fs.existsSync(BAD_WORDS_PATH)) {
            return;
        }

        const stats =
            fs.statSync(BAD_WORDS_PATH);

        const modified =
            stats.mtimeMs;

        if (
            modified !==
            lastBadWordsMTime
        ) {
            badWords =
                loadBadWords();

            lastBadWordsMTime =
                modified;

            console.log(
                `[AutoMod] Loaded ${badWords.length} bad words.`
            );
        }

    } catch (error) {
        console.error(
            '[AutoMod] Failed to refresh BadWords.json:',
            error.message
        );
    }
}


module.exports = {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) {
            return;
        }

        if (!message.guild) {
            return;
        }

        refreshBadWordsIfNeeded();


        const detectedBadWord =
            containsBadWord(
                message.content
            );

        if (detectedBadWord) {
            console.log(
                `[AutoMod] Bad word detected from ${message.author.tag}.`
            );

            await deleteAndWarn(
                message,
                '**Watch your words, or else you\'ll part ways with us!**'
            );

            return;
        }


        const invites =
            extractDiscordInvites(
                message.content
            );

        if (invites.length === 0) {
            return;
        }

        for (const inviteCode of invites) {
            const allowed =
                await isInviteAllowed(
                    message,
                    inviteCode
                );

            if (!allowed) {
                await deleteAndWarn(
                    message,
                    '**Invitation links to other servers are not allowed!**'
                );

                return;
            }
        }
    }
};
