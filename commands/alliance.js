const {
    SlashCommandBuilder,
    EmbedBuilder,
    WebhookClient,
    AttachmentBuilder
} = require('discord.js');

const axios = require('axios');

const {
    allyCard,
    linkRow
} = require('../utils/cards');
const fs = require('fs');
const path = require('path');

const alliesPath = path.join(
    __dirname,
    '..',
    'data',
    'allies.json'
);

const statsPath = path.join(
    __dirname,
    '..',
    'data',
    'guild-stats.json'
);

const ALLOWED_ROLES = [
    '1543595770949804172',
    '1543718013889548438'
];

const GUILD_WELCOME_WEBHOOK =
    process.env.GUILD_WELCOME_WEBHOOK;

const GUILD_ALLY_WEBHOOK =
    process.env.GUILD_ALLY_WEBHOOK;

const GITHUB_TOKEN =
    process.env.GITHUB_TOKEN;

const GITHUB_OWNER =
    process.env.GITHUB_OWNER || 'Zrefo';

const GITHUB_REPO =
    process.env.GITHUB_REPO || 'EME-GUILD';

const GITHUB_BRANCH =
    process.env.GITHUB_BRANCH || 'main';


function hasPermission(member) {

    return ALLOWED_ROLES.some(roleId =>
        member.roles.cache.has(roleId)
    );
}


async function getGithubFile(filePath) {

    const url =
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;

    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    const content =
        Buffer.from(
            response.data.content,
            'base64'
        ).toString('utf8');

    return {
        content: JSON.parse(content),
        sha: response.data.sha
    };
}


async function updateGithubFile(
    filePath,
    content,
    sha,
    message
) {

    const url =
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    await axios.put(
        url,
        {
            message,
            content: Buffer
                .from(
                    JSON.stringify(
                        content,
                        null,
                        4
                    )
                )
                .toString('base64'),
            sha,
            branch: GITHUB_BRANCH
        },
        {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    );
}


async function sendWelcomeWebhook(
    guildName,
    removed = false
) {

    const webhook =
        new WebhookClient({
            url: GUILD_WELCOME_WEBHOOK
        });

    const image = await allyCard({
        name: guildName,
        removed
    });

    await webhook.send({
        files: [
            new AttachmentBuilder(image, {
                name: removed
                    ? 'ally-removed.png'
                    : 'new-ally.png',
                description: removed
                    ? `${guildName} is no longer an ally of the EME Guild`
                    : `${guildName} is a new ally of the EME Guild`
            })
        ],
        components: [
            linkRow(
                'Alliances List',
                'https://eme-guild.xyz/alliances/'
            )
        ],
        withComponents: true
    });
}


async function sendAllyLog(
    guildName,
    interaction,
    removed = false
) {

    const webhook =
        new WebhookClient({
            url: GUILD_ALLY_WEBHOOK
        });

    const embed =
        new EmbedBuilder()
            .setColor(
                removed
                    ? '#ff0000'
                    : '#24ff00'
            )
            .setDescription(
                `<:gamepad:1543612182246199363> **Guild name**\n` +
                `\`${guildName}\`\n\n` +
                `<:star:1543612128114769930> **${removed ? 'Removed' : 'Added'} by**\n` +
                `${interaction.user}`
            );

    if (removed) {

        embed.setTitle(
            '<:no:1543612318305226773> Ally has been removed'
        );

    } else {

        embed.setTitle(
            '<:yes:1543612207990833253> New ally has been added'
        );
    }

    await webhook.send({
        embeds: [embed]
    });
}


module.exports = {

    data: new SlashCommandBuilder()
        .setName('alliance')
        .setDescription('Manage EME Guild alliances.')
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Choose an action.')
                .setRequired(true)
                .addChoices(
                    {
                        name: 'Add',
                        value: 'add'
                    },
                    {
                        name: 'Remove',
                        value: 'remove'
                    }
                )
        )
        .addStringOption(option =>
            option
                .setName('guild')
                .setDescription('Enter the guild name.')
                .setRequired(true)
        ),

    async execute(interaction) {

        if (!hasPermission(interaction.member)) {

            return interaction.reply({
                content:
                    '<:no:1543612318305226773> **Looks like you don\'t have permissions to use this command...**',
                ephemeral: true
            });
        }

        const action =
            interaction.options.getString('action');

        const guildName =
            interaction.options
                .getString('guild')
                .trim();

        if (!guildName) {

            return interaction.reply({
                content:
                    '<:no:1543612318305226773> **Guild name cannot be empty.**',
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        try {


            const alliesFile =
                await getGithubFile(
                    'data/allies.json'
                );

            const allies =
                Array.isArray(alliesFile.content)
                    ? alliesFile.content
                    : [];



            if (action === 'add') {

                const alreadyExists =
                    allies.some(
                        ally =>
                            String(ally).toLowerCase() ===
                            guildName.toLowerCase()
                    );

                if (alreadyExists) {

                    return interaction.editReply({
                        content:
                            `<:no:1543612318305226773> **\`${guildName}\` is already an ally of the EME Guild.**`
                    });
                }


                allies.push(guildName);



                await updateGithubFile(
                    'data/allies.json',
                    allies,
                    alliesFile.sha,
                    `Add ${guildName} to alliances`
                );



                const statsFile =
                    await getGithubFile(
                        'data/guild-stats.json'
                    );

                const stats =
                    statsFile.content || {};

                stats.allyCount =
                    allies.length;



                await updateGithubFile(
                    'data/guild-stats.json',
                    stats,
                    statsFile.sha,
                    `Update ally count - ${guildName}`
                );



                await sendWelcomeWebhook(
                    guildName,
                    false
                );



                await sendAllyLog(
                    guildName,
                    interaction,
                    false
                );



                return interaction.editReply({
                    content:
                        `<:yes:1543612207990833253> (**\`${guildName}\`** Has been added to the alliances.)`
                });
            }



            if (action === 'remove') {

                const index =
                    allies.findIndex(
                        ally =>
                            String(ally).toLowerCase() ===
                            guildName.toLowerCase()
                    );

                if (index === -1) {

                    return interaction.editReply({
                        content:
                            `<:no:1543612318305226773> **\`${guildName}\` is not in the alliance list.**`
                    });
                }


                allies.splice(index, 1);



                await updateGithubFile(
                    'data/allies.json',
                    allies,
                    alliesFile.sha,
                    `Remove ${guildName} from alliances`
                );



                const statsFile =
                    await getGithubFile(
                        'data/guild-stats.json'
                    );

                const stats =
                    statsFile.content || {};

                stats.allyCount =
                    allies.length;



                await updateGithubFile(
                    'data/guild-stats.json',
                    stats,
                    statsFile.sha,
                    `Update ally count - ${guildName}`
                );



                await sendWelcomeWebhook(
                    guildName,
                    true
                );


                /*
                 * LOG WEBHOOK
                 */

                await sendAllyLog(
                    guildName,
                    interaction,
                    true
                );


                /*
                 * RESPONSE
                 */

                return interaction.editReply({
                    content:
                        `<:no:1543612318305226773> (**\`${guildName}\`** Has been removed from the alliances.)`
                });
            }

        } catch (error) {

            console.error(
                'Alliance command error:',
                error.response?.data || error
            );

            return interaction.editReply({
                content:
                    '<:no:1543612318305226773> **Something went wrong while updating the alliance data.**'
            });
        }
    }
};
