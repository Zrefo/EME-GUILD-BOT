const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('web')
        .setDescription('Shows the official EME Guild website'),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor('#24ff00')
            .setDescription(
                '## <:EME_GUILD:1544405447619121172> The official website for the EME guild!\n\n' +
                '<:star:1543612128114769930> **Here you will find**\n' +
                '- A list of guild members with links to their HylexMC profiles\n' +
                '- A list of alliances with links to the guilds HylexMC profiles\n' +
                '- Information about the EME guild\n' +
                '- Rules\n' +
                '- The number of EME guild members\n' +
                '- The number of alliances'
            )
            .setImage('https://cdn.discordapp.com/attachments/1199399416231108728/1544490213890465883/EME_GUILD.gif?ex=6a98b21a&is=6a97609a&hm=cd023851f8617100e935bbfe5b48de029f553ff2fa489e4e261427817a1a2f17&')
            .setThumbnail(
                interaction.guild.iconURL({
                    dynamic: true,
                    size: 1024
                })
            );

        const button = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL('https://eme-guild.xyz/')
            .setEmoji('<:EME_GUILD:1544405447619121172>');

        const row = new ActionRowBuilder()
            .addComponents(button);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
