const {
    Events,
    AttachmentBuilder
} = require('discord.js');

const { welcomeCard } = require('../utils/cards');

const WELCOME_CHANNEL_ID =
    '1543693539123265646';

const WELCOME_ROLE_ID =
    '1543588064985747477';


module.exports = {

    name: Events.GuildMemberAdd,

    async execute(member) {

        try {


            const role =
                member.guild.roles.cache.get(
                    WELCOME_ROLE_ID
                );

            if (role) {

                await member.roles.add(
                    role
                );

            } else {

                console.error(
                    `Welcome role ${WELCOME_ROLE_ID} not found.`
                );
            }



            const channel =
                member.guild.channels.cache.get(
                    WELCOME_CHANNEL_ID
                );

            if (!channel) {

                console.error(
                    `Welcome channel ${WELCOME_CHANNEL_ID} not found.`
                );

                return;
            }


            const image = await welcomeCard({
                name: member.displayName,
                avatarURL: member.user.displayAvatarURL({
                    extension: 'png',
                    size: 256,
                    forceStatic: true
                }),
                members: member.guild.memberCount,
                created: member.user.createdAt.toLocaleDateString(
                    'en-GB',
                    {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'UTC'
                    }
                )
            });


            await channel.send({
                files: [
                    new AttachmentBuilder(image, {
                        name: 'welcome.png',
                        description: `Welcome to the EME Guild, ${member.displayName}!`
                    })
                ]
            });


        } catch (error) {

            console.error(
                'Welcomer error:',
                error
            );

        }

    }

};
