const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const { topCard } = require('../utils/cards');

const dataPath = path.join(
    __dirname,
    '..',
    'data',
    'levels.json'
);

module.exports = {

    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('View the top 10 guild scores.'),

    async execute(interaction) {

        await interaction.deferReply();

        let data;

        try {
            data = JSON.parse(
                fs.readFileSync(dataPath, 'utf8')
            );
        } catch {
            data = { users: {} };
        }

        const ranking = Object.entries(data.users || {})
            .sort((a, b) =>
                (Number(b[1].level) || 0) - (Number(a[1].level) || 0)
                || (Number(b[1].xp) || 0) - (Number(a[1].xp) || 0)
            )
            .slice(0, 10);

        const rows = await Promise.all(
            ranking.map(async ([id, userData]) => {

                const member =
                    await interaction.guild.members
                        .fetch(id)
                        .catch(() => null);

                const user =
                    member?.user
                    || await interaction.client.users
                        .fetch(id)
                        .catch(() => null);

                return {
                    name:
                        member?.displayName
                        || user?.globalName
                        || user?.username,
                    avatarURL: user?.displayAvatarURL({
                        extension: 'png',
                        size: 128,
                        forceStatic: true
                    }),
                    level: userData.level ?? 0,
                    xp: userData.xp ?? 0
                };
            })
        );

        const image = await topCard(rows);

        await interaction.editReply({
            files: [
                new AttachmentBuilder(image, {
                    name: 'top.png',
                    description: 'Top 10 guild scores'
                })
            ]
        });
    }
};
