const {
    Events,
    ActivityType
} = require('discord.js');

const ROLE_ID =
    '1543589138387697684';

let lastCount = null;



function getMemberCount(guild) {

    const role =
        guild.roles.cache.get(ROLE_ID);

    if (!role) {

        console.error(
            `Role ${ROLE_ID} not found.`
        );

        return 0;
    }

    return role.members.size;
}



async function updateStatus(client, guild) {

    const count =
        getMemberCount(guild);


    if (count === lastCount) {
        return;
    }

    lastCount = count;

    await client.user.setActivity(
        `${count} members`,
        {
            type: ActivityType.Watching
        }
    );

    console.log(
        `Status: Watching ${count} members`
    );
}



module.exports = {

    name: Events.ClientReady,

    once: true,

    async execute(client) {

        console.log(
            'Member status system started.'
        );



        for (
            const guild
            of client.guilds.cache.values()
        ) {

            try {

                await guild.members.fetch();

                console.log(
                    'Guild members fetched.'
                );

                await updateStatus(
                    client,
                    guild
                );

            } catch (error) {

                console.error(
                    'Failed to fetch guild members:',
                    error
                );
            }

            break;
        }



        client.on(
            Events.GuildMemberUpdate,
            async (
                oldMember,
                newMember
            ) => {

                const hadRole =
                    oldMember.roles.cache.has(
                        ROLE_ID
                    );

                const hasRole =
                    newMember.roles.cache.has(
                        ROLE_ID
                    );



                if (
                    hadRole === hasRole
                ) {
                    return;
                }



                await updateStatus(
                    client,
                    newMember.guild
                );
            }
        );



        client.on(
            Events.GuildMemberAdd,
            async member => {

                if (
                    member.roles.cache.has(
                        ROLE_ID
                    )
                ) {

                    await updateStatus(
                        client,
                        member.guild
                    );
                }
            }
        );



        client.on(
            Events.GuildMemberRemove,
            async member => {

                if (
                    member.roles.cache.has(
                        ROLE_ID
                    )
                ) {

                    await updateStatus(
                        client,
                        member.guild
                    );
                }
            }
        );
    }
};
