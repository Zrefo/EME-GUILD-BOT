const {
    SlashCommandBuilder,
    WebhookClient,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const axios = require('axios');

const {
    memberCard,
    linkRow
} = require('../utils/cards');



const allowedRoles = [
    '1543595770949804172',
    '1543718013889548438'
];



const guildRoleId =
    '1543589138387697684';



const githubToken =
    process.env.GITHUB_TOKEN;

const githubOwner =
    process.env.GITHUB_OWNER;

const githubRepo =
    process.env.GITHUB_REPO;

const githubBranch =
    process.env.GITHUB_BRANCH || 'main';



const githubHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
};



const welcomeWebhook =
    new WebhookClient({
        url: process.env.GUILD_WELCOME_WEBHOOK
    });

const logWebhook =
    new WebhookClient({
        url: process.env.GUILD_LOG_WEBHOOK
    });



async function sendMemberCard(
    member,
    nickname,
    removed = false
) {

    const image = await memberCard({
        nick: nickname,
        discordName: member.displayName,
        discordAvatarURL: member.user.displayAvatarURL({
            extension: 'png',
            size: 128,
            forceStatic: true
        }),
        removed
    });

    await welcomeWebhook.send({
        files: [
            new AttachmentBuilder(image, {
                name: removed
                    ? 'member-removed.png'
                    : 'new-member.png',
                description: removed
                    ? `${nickname} has been removed from the EME Guild`
                    : `${nickname} has joined the EME Guild`
            })
        ],
        components: [
            linkRow(
                'Members List',
                'https://eme-guild.xyz/members/'
            )
        ],
        withComponents: true
    });
}



function getGithubUrl(filePath) {
    return (
        `https://api.github.com/repos/` +
        `${githubOwner}/` +
        `${githubRepo}/contents/` +
        `${filePath}`
    );
}



async function getGithubFile(filePath) {

    const response = await axios.get(
        getGithubUrl(filePath),
        {
            headers: githubHeaders,
            params: {
                ref: githubBranch
            }
        }
    );

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
    commitMessage
) {

    const encodedContent =
        Buffer.from(
            JSON.stringify(
                content,
                null,
                4
            )
        ).toString('base64');

    await axios.put(
        getGithubUrl(filePath),
        {
            message: commitMessage,
            content: encodedContent,
            sha: sha,
            branch: githubBranch
        },
        {
            headers: githubHeaders
        }
    );
}



module.exports = {

    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('Manage EME Guild members.')

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
                .setName('nickname')
                .setDescription('Enter the Minecraft in-game name.')
                .setRequired(true)
        )

        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Select the Discord user.')
                .setRequired(true)
        ),


    async execute(interaction) {


        const hasPermission =
            allowedRoles.some(roleId =>
                interaction.member.roles.cache.has(
                    roleId
                )
            );

        if (!hasPermission) {

            return interaction.reply({
                content:
                    '<:no:1543612318305226773> **Looks like you don\'t have permissions to use this command...**',
                ephemeral: true
            });
        }



        const action =
            interaction.options.getString(
                'action'
            );

        const nickname =
            interaction.options
                .getString('nickname')
                .trim();

        const user =
            interaction.options.getUser(
                'user'
            );



        if (!nickname) {

            return interaction.reply({
                content:
                    '<:no:1543612318305226773> **Please provide a valid in-game name.**',
                ephemeral: true
            });
        }


        await interaction.deferReply({
            ephemeral: true
        });


        try {


            const membersFile =
                await getGithubFile(
                    'data/members.json'
                );

            let members =
                membersFile.content;

            if (!Array.isArray(members)) {
                throw new Error(
                    'data/members.json is not an array.'
                );
            }



            if (action === 'add') {

                const alreadyExists =
                    members.some(
                        member =>
                            String(member)
                                .toLowerCase() ===
                            nickname.toLowerCase()
                    );

                if (alreadyExists) {

                    return interaction.editReply({
                        content:
                            `<:no:1543612318305226773> **\`${nickname}\` is already in the guild.**`
                    });
                }


                members.push(nickname);



                const statsFile =
                    await getGithubFile(
                        'data/guild-stats.json'
                    );

                const stats =
                    statsFile.content;


                stats.memberCount =
                    members.length;



                await updateGithubFile(
                    'data/members.json',
                    members,
                    membersFile.sha,
                    `Add ${nickname} to guild`
                );



                await updateGithubFile(
                    'data/guild-stats.json',
                    stats,
                    statsFile.sha,
                    `Update guild member count`
                );



                const member =
                    await interaction.guild
                        .members
                        .fetch(user.id);

                await member.roles.add(
                    guildRoleId
                );



                await sendMemberCard(
                    member,
                    nickname,
                    false
                );



                const logEmbed =
                    new EmbedBuilder()
                        .setColor('#24ff00')
                        .setTitle(
                            '<:yes:1543612207990833253> New member has been added'
                        )
                        .setDescription(
                            `<:gamepad:1543612182246199363> **In-game name**\n` +
                            `\`${nickname}\`\n\n` +

                            `<:discord:1543612446751727747> **Discord**\n` +
                            `${user}\n\n` +

                            `<:star:1543612128114769930> **Added by**\n` +
                            `${interaction.user}`
                        )
                        .setThumbnail(
                            `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}`
                        )
                        .setTimestamp();


                await logWebhook.send({
                    embeds: [
                        logEmbed
                    ]
                });



                return interaction.editReply({
                    content:
                        `<:yes:1543612207990833253> **\`${nickname}\` Has been added to the guild.**`
                });
            }



            if (action === 'remove') {

                const index =
                    members.findIndex(
                        member =>
                            String(member)
                                .toLowerCase() ===
                            nickname.toLowerCase()
                    );


                if (index === -1) {

                    return interaction.editReply({
                        content:
                            `<:no:1543612318305226773> **\`${nickname}\` is not in the guild.**`
                    });
                }


                members.splice(
                    index,
                    1
                );



                const statsFile =
                    await getGithubFile(
                        'data/guild-stats.json'
                    );

                const stats =
                    statsFile.content;


                stats.memberCount =
                    members.length;



                await updateGithubFile(
                    'data/members.json',
                    members,
                    membersFile.sha,
                    `Remove ${nickname} from guild`
                );



                await updateGithubFile(
                    'data/guild-stats.json',
                    stats,
                    statsFile.sha,
                    `Update guild member count`
                );



                const member =
                    await interaction.guild
                        .members
                        .fetch(user.id);

                await member.roles.remove(
                    guildRoleId
                );



                await sendMemberCard(
                    member,
                    nickname,
                    true
                );



                const logEmbed =
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle(
                            '<:no:1543612318305226773> Member has been removed'
                        )
                        .setDescription(
                            `<:gamepad:1543612182246199363> **In-game name**\n` +
                            `\`${nickname}\`\n\n` +

                            `<:discord:1543612446751727747> **Discord**\n` +
                            `${user}\n\n` +

                            `<:star:1543612128114769930> **Removed by**\n` +
                            `${interaction.user}`
                        )
                        .setThumbnail(
                            `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}`
                        )
                        .setTimestamp();


                await logWebhook.send({
                    embeds: [
                        logEmbed
                    ]
                });



                return interaction.editReply({
                    content:
                        `<:no:1543612318305226773> (**\`${nickname}\`** Has been removed from the guild.)`
                });
            }

        } catch (error) {

            console.error(
                'Guild command error:',
                error
            );

            return interaction.editReply({
                content:
                    '<:no:1543612318305226773> **Something went wrong while updating the guild. Please try again later.**'
            });
        }
    }
};
