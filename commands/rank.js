const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const { rankCard } = require('../utils/cards');

const dataPath = path.join(
    __dirname,
    '..',
    'data',
    'levels.json'
);

function xpForLevel(level) {
    return Math.floor(
        100 * Math.pow(level, 1.5)
    );
}

function loadData() {
    try {
        return JSON.parse(
            fs.readFileSync(dataPath, 'utf8')
        );
    } catch (error) {
        console.error('Failed to load levels.json:', error);

        return { users: {} };
    }
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View a guild rank profile.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('View another user\'s rank profile.')
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply();

        const target =
            interaction.options.getUser('user')
            || interaction.user;

        const member =
            await interaction.guild.members
                .fetch(target.id)
                .catch(() => null);

        const name =
            member?.displayName
            || target.globalName
            || target.username;

        const users = loadData().users || {};

        const userData = users[target.id] || {
            xp: 0,
            level: 0
        };

        const level = Number(userData.level) || 0;
        const xp = Number(userData.xp) || 0;

        const currentLevelXp = xpForLevel(level);
        const nextLevelXp = xpForLevel(level + 1);

        const ranking = Object.entries(users)
            .sort((a, b) =>
                (Number(b[1].level) || 0) - (Number(a[1].level) || 0)
                || (Number(b[1].xp) || 0) - (Number(a[1].xp) || 0)
            );

        const index = ranking.findIndex(
            ([id]) => id === target.id
        );

        const image = await rankCard({
            name,
            avatarURL: target.displayAvatarURL({
                extension: 'png',
                size: 256,
                forceStatic: true
            }),
            level,
            rank: index === -1 ? ranking.length + 1 : index + 1,
            xp,
            into: Math.max(0, xp - currentLevelXp),
            need: Math.max(1, nextLevelXp - currentLevelXp)
        });

        await interaction.editReply({
            files: [
                new AttachmentBuilder(image, {
                    name: 'rank.png',
                    description: `${name} - level ${level}`
                })
            ]
        });
    }
};
