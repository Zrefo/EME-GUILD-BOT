const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const giveaways = new Map();

function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d|w)$/i);

    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a giveaway.')
        .addStringOption(option =>
            option
                .setName('prize')
                .setDescription('The prize of the giveaway.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration: 10s, 5m, 2h, 7d, etc.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('winners')
                .setDescription('Number of winners.')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(true)
        ),

    async execute(interaction) {
        const requiredRoleId = '1543595770949804172';

        if (!interaction.member.roles.cache.has(requiredRoleId)) {
            return;
        }

        const prize = interaction.options.getString('prize');
        const durationString = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');

        const duration = parseDuration(durationString);

        if (!duration || duration < 1000) {
            return interaction.reply({
                content: 'Invalid duration. Use formats like `10s`, `5m`, `2h`, `7d`.',
                ephemeral: true
            });
        }

        const endTime = Date.now() + duration;

        const giveawayId = `${interaction.channel.id}-${Date.now()}`;

        const giveaway = {
            id: giveawayId,
            prize,
            winnerCount,
            endTime,
            participants: new Set(),
            messageId: null
        };

        giveaways.set(giveawayId, giveaway);

        const embed = new EmbedBuilder()
            .setColor(`#24ff00`)
            .setTitle('<:68492gift:1543612343185838110> GIVEAWAY')
            .setDescription(
                `## ${prize}\n\n` +
                `Click the button below to enter!\n\n` +
                `<:40437star:1543612128114769930> **Winners:** ${winnerCount}\n` +
                `<:11268100:1543611993204854866> **Entries:** 0\n` +
                `<:57161eyes:1543612233861562478> **Ends:** <t:${Math.floor(endTime / 1000)}:R>`
            )
            .setFooter({
                text: 'Good luck everyone!'
            })
            .setTimestamp(endTime);

        const button = new ButtonBuilder()
            .setCustomId(`giveaway_enter_${giveawayId}`)
            .setLabel(' ')
            .setEmoji('<:65115tada:1543612287250726962>')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(button);

        const giveawayMessage = await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        giveaway.messageId = giveawayMessage.id;

        await interaction.reply({
            content: 'Giveaway created successfully! 🎉',
            ephemeral: true
        });

        setTimeout(async () => {
            const currentGiveaway = giveaways.get(giveawayId);

            if (!currentGiveaway) return;

            const participants = [...currentGiveaway.participants];

            if (participants.length === 0) {
                const endedEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🎉 Giveaway Ended')
                    .setDescription(
                        `**Prize:** ${currentGiveaway.prize}\n\n` +
                        `❌ There were no participants.`
                    );

                await giveawayMessage.edit({
                    embeds: [endedEmbed],
                    components: []
                });

                giveaways.delete(giveawayId);
                return;
            }

            const shuffled = participants.sort(() => Math.random() - 0.5);

            const winners = shuffled.slice(
                0,
                Math.min(currentGiveaway.winnerCount, participants.length)
            );

            const winnerMentions = winners
                .map(id => `<@${id}>`)
                .join(', ');

            const endedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🎉 Giveaway Ended!')
                .setDescription(
                    `**Prize:** ${currentGiveaway.prize}\n\n` +
                    `🏆 **Winner${winners.length > 1 ? 's' : ''}:** ${winnerMentions}\n\n` +
                    `👥 **Entries:** ${participants.length}`
                )
                .setTimestamp();

            await giveawayMessage.edit({
                embeds: [endedEmbed],
                components: []
            });

            await interaction.channel.send(
                `🎉 Congratulations ${winnerMentions}! You won **${currentGiveaway.prize}**!`
            );

            giveaways.delete(giveawayId);

        }, duration);
    }
};

module.exports.giveaways = giveaways;
