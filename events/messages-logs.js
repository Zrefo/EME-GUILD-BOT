const {
    Events,
    EmbedBuilder,
    AuditLogEvent
} = require('discord.js');

module.exports = {
    name: Events.MessageDelete,

    async execute(message) {
        if (!message.guild) return;

        const logChannelId = '1543591702202421358';

        const logChannel = message.guild.channels.cache.get(logChannelId);

        if (!logChannel) return;

        const authorId = message.author?.id || 'Unknown';
        const channelId = message.channel?.id || 'Unknown';
        const content = message.content || '[Content unavailable]';

        let deletedBy = 'Unknown';

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const auditLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 20
            });

            const entry = auditLogs.entries.find(entry => {
                return (
                    entry.target?.id === authorId &&
                    entry.extra?.channel?.id === channelId &&
                    Date.now() - entry.createdTimestamp < 10000
                );
            });

            if (entry?.executor) {
                deletedBy = entry.executor.id;
            }
        } catch (error) {
            console.error('Failed to fetch message delete audit log:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Deleted Message 🗑️')
            .setDescription(
                `\`\`\`ansi
[2;40m[2;32mAuthor:[0m [2;31m${authorId}[0m
[2;40m[2;32mChannel:[0m [2;35m${channelId}[0m
[2;40m[2;32mDeleted by:[0m [2;34m${deletedBy}[0m
[2;40m[2;32mMessage:[0m [2;37m${content}[0m
\`\`\``
            )
            .setTimestamp();

        if (message.author) {
            embed.setThumbnail(
                message.author.displayAvatarURL({
                    size: 256
                })
            );
        }

        await logChannel.send({
            embeds: [embed]
        });
    }
};
