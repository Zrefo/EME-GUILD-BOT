const {
    Events,
    EmbedBuilder,
    AuditLogEvent
} = require('discord.js');

module.exports = {
    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember) {
        const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
        const newTimeout = newMember.communicationDisabledUntilTimestamp;

        if (
            newTimeout === oldTimeout ||
            !newTimeout ||
            newTimeout <= Date.now()
        ) {
            return;
        }

        const logChannelId = '1543591679926341732';
        const logChannel = newMember.guild.channels.cache.get(logChannelId);

        if (!logChannel) return;

        let issuedBy = 'Unknown';
        let reason = 'No reason provided';

        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 10
            });

            const entry = auditLogs.entries.find(entry => {
                if (!entry.target) return false;

                return (
                    entry.target.id === newMember.id &&
                    Date.now() - entry.createdTimestamp < 5000
                );
            });

            if (entry) {
                issuedBy = entry.executor?.id || 'Unknown';
                reason = entry.reason || 'No reason provided';
            }
        } catch (error) {
            console.error('Failed to fetch timeout audit logs:', error);
        }

        const durationMs = newTimeout - Date.now();

        const totalSeconds = Math.floor(durationMs / 1000);

        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let duration = '';

        if (days > 0) duration += `${days}d `;
        if (hours > 0) duration += `${hours}h `;
        if (minutes > 0) duration += `${minutes}m `;
        if (seconds > 0) duration += `${seconds}s`;

        duration = duration.trim() || '<1s';

        const embed = new EmbedBuilder()
            .setColor('#A5F2F3')
            .setTitle('New Timeout ⌛')
            .setDescription(
                `\`\`\`ansi
[2;40m[2;32mTarget:[0m[2;40m [2;31m${newMember.id}[0m
[2;40m[2;32mReason:[0m[2;40m [2;35m${reason}[0m
[2;40m[2;32mDuration:[0m [0;32m${duration}[0m
[2;32m[2;40mIssued by[0m[2;40m: [2;36m${issuedBy}[0m
\`\`\``
            )
            .setTimestamp();

        await logChannel.send({
            embeds: [embed]
        });
    }
};
