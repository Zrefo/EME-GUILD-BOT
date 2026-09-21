const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription(
            'View the list of available commands.'
        ),

    async execute(interaction) {

        const embed =
            new EmbedBuilder()
                .setColor('#1b6b3f')
                .setTitle(
                    '📚 EME Bot — Help'
                )
                .setDescription(
                    'Here is a list of all available commands and what they do.'
                )

                .addFields(

                    {
                        name: '🏆 Achievements',
                        value:
                            [
                                '**/achievements**',
                                'View your achievements, progress and unlocked achievements.',

                                '**/achievement-path**',
                                'View your current achievement path and the achievements you are closest to unlocking.',

                                '**/achievement-top**',
                                'View the top users ranked by total achievement points.'
                            ].join('\n\n'),
                        inline: false
                    },

                    {
                        name: '📈 Levels',
                        value:
                            [
                                '**/rank**',
                                'View your rank card with your level, XP, ranking and progress.',

                                '**/top**',
                                'View the top users ranked by level and XP.'
                            ].join('\n\n'),
                        inline: false
                    },

                    {
                        name: '👤 User',
                        value:
                            [
                                '**/user**',
                                'View your Discord profile information, account creation date, server join date, level, XP and achievement points.'
                            ].join('\n'),
                        inline: false
                    },

                    {
                        name: '🌐 Website',
                        value:
                            [
                                '**/web**',
                                'Get a link to the official EME website.'
                            ].join('\n'),
                        inline: false
                    }

                )

                .setFooter({
                    text:
                        'EME • Use /help anytime to see available commands.'
                })
                .setTimestamp();

        await interaction.reply({
            embeds: [
                embed
            ]
        });
    }
};
