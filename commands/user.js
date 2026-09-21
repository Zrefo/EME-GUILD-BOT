const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const achievementsPath = path.join(
    __dirname,
    '..',
    'data',
    'achievements.json'
);

const levelsPath = path.join(
    __dirname,
    '..',
    'data',
    'levels.json'
);

module.exports = {

    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription(
            'View information about a Discord user.'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The user whose profile you want to view.'
                )
                .setRequired(false)
        ),

    async execute(interaction) {

        const target =
            interaction.options.getUser('user')
            || interaction.user;

        /*
         * GET GUILD MEMBER
         */

        let member = null;

        try {
            member =
                await interaction.guild.members.fetch(
                    target.id
                );
        } catch (error) {
            console.warn(
                `Could not fetch guild member ${target.id}.`
            );
        }

        /*
         * DATES
         */

        const accountCreated =
            Math.floor(
                target.createdTimestamp / 1000
            );

        const joinedServer =
            member?.joinedTimestamp
                ? Math.floor(
                    member.joinedTimestamp / 1000
                )
                : null;

        /*
         * ACHIEVEMENT DATA
         */

        let achievementPoints = 0;
        let achievementsUnlocked = 0;

        try {

            const data =
                JSON.parse(
                    fs.readFileSync(
                        achievementsPath,
                        'utf8'
                    )
                );

            const userData =
                data.users?.[target.id];

            if (userData) {

                achievementPoints =
                    Number(
                        userData.points
                    ) || 0;

                achievementsUnlocked =
                    Array.isArray(
                        userData.earned
                    )
                        ? userData.earned.length
                        : 0;
            }

        } catch (error) {

            console.warn(
                'Could not load achievement data.'
            );
        }

        /*
         * LEVEL DATA
         */

        let level = 0;
        let xp = 0;

        try {

            const data =
                JSON.parse(
                    fs.readFileSync(
                        levelsPath,
                        'utf8'
                    )
                );

            const userData =
                data.users?.[target.id];

            if (userData) {

                level =
                    Number(
                        userData.level
                    ) || 0;

                xp =
                    Number(
                        userData.xp
                    ) || 0;
            }

        } catch (error) {

            console.warn(
                'Could not load level data.'
            );
        }

        /*
         * DISPLAY NAME
         */

        const displayName =
            member?.displayName
            || target.globalName
            || target.username;

        /*
         * EMBED
         */

        const embed =
            new EmbedBuilder()
                .setColor('#1b6b3f')
                .setAuthor({
                    name:
                        `${displayName}'s Profile`,
                    iconURL:
                        target.displayAvatarURL({
                            extension: 'png',
                            size: 128
                        })
                })
                .setThumbnail(
                    target.displayAvatarURL({
                        extension: 'png',
                        size: 256
                    })
                )
                .addFields(

                    {
                        name: '👤 Username',
                        value:
                            `@${target.username}`,
                        inline: true
                    },

                    {
                        name: '🆔 User ID',
                        value:
                            `\`${target.id}\``,
                        inline: true
                    },

                    {
                        name: '📅 Account Created',
                        value:
                            `<t:${accountCreated}:F>\n<t:${accountCreated}:R>`,
                        inline: false
                    },

                    {
                        name: '🏠 Joined Server',
                        value:
                            joinedServer
                                ? `<t:${joinedServer}:F>\n<t:${joinedServer}:R>`
                                : 'Unknown',
                        inline: false
                    },

                    {
                        name: '⭐ Achievement Points',
                        value:
                            `${achievementPoints} points`,
                        inline: true
                    },

                    {
                        name: '🏆 Achievements',
                        value:
                            `${achievementsUnlocked} unlocked`,
                        inline: true
                    },

                    {
                        name: '📈 Level',
                        value:
                            `Level ${level}\n${xp} XP`,
                        inline: true
                    }

                )
                .setFooter({
                    text:
                        `Requested by ${interaction.user.username}`
                })
                .setTimestamp();

        await interaction.reply({
            embeds: [
                embed
            ]
        });
    }
};
