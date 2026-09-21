const {
    Events,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');


const TICKET_CATEGORY_ID =
    '1544573985306578974';

const CLOSED_CATEGORY_ID =
    '1544575759543312434';

const STAFF_ROLE_ID =
    '1544505327985364992';

const ALLIANCE_REQUEST_CHANNEL_ID =
    '1544576897919352863';

const ALLIANCE_RESPONSE_CHANNEL_ID =
    '1544577635789701181';

const SIX_HOURS =
    6 * 60 * 60 * 1000;

const messagesPath =
    path.join(
        __dirname,
        '..',
        'messages'
    );


function loadMessage(fileName) {

    const filePath =
        path.join(
            messagesPath,
            fileName
        );

    try {

        return JSON.parse(
            fs.readFileSync(
                filePath,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            `Failed to load ${filePath}:`,
            error.message
        );

        throw error;
    }
}


function clone(data) {

    return JSON.parse(
        JSON.stringify(data)
    );
}


function replaceText(
    object,
    replacements
) {

    if (Array.isArray(object)) {

        for (const item of object) {

            replaceText(
                item,
                replacements
            );
        }

        return;
    }

    if (
        !object ||
        typeof object !== 'object'
    ) {
        return;
    }

    for (
        const key of Object.keys(object)
    ) {

        if (
            typeof object[key] === 'string'
        ) {

            for (
                const [search, replacement]
                of Object.entries(replacements)
            ) {

                object[key] =
                    object[key].replaceAll(
                        search,
                        replacement
                    );
            }

        } else if (
            typeof object[key] === 'object'
        ) {

            replaceText(
                object[key],
                replacements
            );
        }
    }
}


async function sendComponentsV2(
    channel,
    data
) {

    await channel.send({
        flags: data.flags ?? 32768,
        components: data.components
    });
}


function getBotId(guild) {

    return (
        guild.members.me?.id ||
        guild.client.user.id
    );
}


function isStaff(interaction) {

    return Boolean(
        interaction.member?.roles?.cache?.has(
            STAFF_ROLE_ID
        )
    );
}


function safeChannelName(
    prefix,
    username
) {

    let cleanUsername =
        username
            .toLowerCase()
            .replace(
                /[^a-z0-9-_]/g,
                '-'
            )
            .replace(
                /-+/g,
                '-'
            )
            .replace(
                /^-+|-+$/g,
                ''
            );

    if (!cleanUsername) {
        cleanUsername = 'user';
    }

    return `${prefix}-${cleanUsername}`
        .slice(0, 100);
}


function getOpenPermissions(
    guild,
    userId
) {

    return [

        {
            id: guild.roles.everyone.id,

            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },

        {
            id: userId,

            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },

        {
            id: STAFF_ROLE_ID,

            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },

        {
            id: getBotId(guild),

            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
            ]
        }
    ];
}


function getClosedPermissions(
    guild
) {

    return [

        {
            id: guild.roles.everyone.id,

            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },

        {
            id: STAFF_ROLE_ID,

            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        },

        {
            id: getBotId(guild),

            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
            ]
        }
    ];
}


async function createEmeTicket(
    interaction,
    nickname
) {

    const guild =
        interaction.guild;

    const channel =
        await guild.channels.create({

            name:
                safeChannelName(
                    'join',
                    interaction.user.username
                ),

            type:
                ChannelType.GuildText,

            parent:
                TICKET_CATEGORY_ID,

            permissionOverwrites:
                getOpenPermissions(
                    guild,
                    interaction.user.id
                )
        });


    const data =
        clone(
            loadMessage(
                'eme-guild.json'
            )
        );


    replaceText(
        data,
        {

            '{user}':
                `<@${interaction.user.id}>`,

            '`name`':
                `\`${nickname}\``,

            '@zrefo_':
                `<@${interaction.user.id}>`,

            'https://mc-heads.net/avatar/':
                `https://mc-heads.net/avatar/${encodeURIComponent(nickname)}`
        }
    );


    await sendComponentsV2(
        channel,
        data
    );

    return channel;
}


async function createOtherTicket(
    interaction
) {

    const guild =
        interaction.guild;

    const channel =
        await guild.channels.create({

            name:
                safeChannelName(
                    'ticket',
                    interaction.user.username
                ),

            type:
                ChannelType.GuildText,

            parent:
                TICKET_CATEGORY_ID,

            permissionOverwrites:
                getOpenPermissions(
                    guild,
                    interaction.user.id
                )
        });


    const data =
        clone(
            loadMessage(
                'other.json'
            )
        );


    replaceText(
        data,
        {

            '(wzmianka użytkownika który otworzył to zgłoszenie)':
                `<@${interaction.user.id}>`
        }
    );


    await sendComponentsV2(
        channel,
        data
    );

    return channel;
}


async function showEmeModal(
    interaction
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                'eme_join_modal'
            )
            .setTitle(
                'Join EME Guild'
            );


    const nickname =
        new TextInputBuilder()
            .setCustomId(
                'minecraft_nickname'
            )
            .setLabel(
                'Minecraft nickname'
            )
            .setPlaceholder(
                'Enter your Minecraft nickname'
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(16);


    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(
                nickname
            )

    );


    await interaction.showModal(
        modal
    );
}


async function showAllianceModal(
    interaction
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                'alliance_request_modal'
            )
            .setTitle(
                'Alliance Request'
            );


    const guildName =
        new TextInputBuilder()
            .setCustomId(
                'guild_name'
            )
            .setLabel(
                'Guild name'
            )
            .setPlaceholder(
                'Enter your guild name'
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(100);


    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(
                guildName
            )

    );


    await interaction.showModal(
        modal
    );
}


async function showRenameModal(
    interaction
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                'rename_ticket'
            )
            .setTitle(
                'Rename Ticket'
            );


    const name =
        new TextInputBuilder()
            .setCustomId(
                'channel_name'
            )
            .setLabel(
                'New channel name'
            )
            .setPlaceholder(
                'Enter new channel name'
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(100);


    modal.addComponents(

        new ActionRowBuilder()
            .addComponents(
                name
            )

    );


    await interaction.showModal(
        modal
    );
}


function disableButtons(
    object
) {

    if (Array.isArray(object)) {

        for (const item of object) {

            disableButtons(
                item
            );
        }

        return;
    }

    if (
        !object ||
        typeof object !== 'object'
    ) {
        return;
    }


    if (
        object.type === 2 &&
        object.custom_id
    ) {

        object.disabled = true;
    }


    for (
        const value
        of Object.values(object)
    ) {

        if (
            typeof value === 'object'
        ) {

            disableButtons(
                value
            );
        }
    }
}


async function closeTicket(
    channel
) {

    const guild =
        channel.guild;



    await channel.send({
        content:
            '🔒 **This ticket has been closed.**\n\n' +
            'This ticket has been moved to the closed tickets category and will be automatically deleted after 6 hours.'
    });



    await channel.permissionOverwrites.set(
        getClosedPermissions(
            guild
        )
    );



    await channel.setParent(
        CLOSED_CATEGORY_ID,
        {
            lockPermissions: false
        }
    );



    await channel.setTopic(
        `closedAt:${Date.now()}`
    );



    setTimeout(
        async () => {

            try {

                await channel.delete(
                    'Ticket closed for 6 hours'
                );

            } catch (error) {

                console.error(
                    'Failed to delete closed ticket:',
                    error
                );
            }

        },
        SIX_HOURS
    );
}



module.exports = {

    name: Events.InteractionCreate,


    async execute(interaction) {


        if (
            interaction.isButton() &&
            interaction.customId === 'eme'
        ) {

            await showEmeModal(
                interaction
            );

            return;
        }



        if (
            interaction.isButton() &&
            interaction.customId === 'ally'
        ) {

            await showAllianceModal(
                interaction
            );

            return;
        }



        if (
            interaction.isButton() &&
            interaction.customId === 'other'
        ) {

            await interaction.deferReply({
                ephemeral: true
            });


            await createOtherTicket(
                interaction
            );


            await interaction.editReply({
                content:
                    'Your ticket has been created.'
            });

            return;
        }



        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
                'eme_join_modal'
        ) {

            const nickname =
                interaction.fields
                    .getTextInputValue(
                        'minecraft_nickname'
                    )
                    .trim();


            await interaction.deferReply({
                ephemeral: true
            });


            await createEmeTicket(
                interaction,
                nickname
            );


            await interaction.editReply({
                content:
                    'Your EME join ticket has been created.'
            });

            return;
        }



        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
                'alliance_request_modal'
        ) {

            const guildName =
                interaction.fields
                    .getTextInputValue(
                        'guild_name'
                    )
                    .trim();


            const channel =
                interaction.guild.channels.cache.get(
                    ALLIANCE_REQUEST_CHANNEL_ID
                );


            if (!channel) {

                await interaction.reply({
                    content:
                        'Alliance request channel was not found.',
                    ephemeral: true
                });

                return;
            }


            const data =
                clone(
                    loadMessage(
                        'alliance-request.json'
                    )
                );


            replaceText(
                data,
                {

                    '(nazwa gildi)':
                        guildName,

                    '(wzmianka użytkownika który złożył tą prośbę)':
                        `<@${interaction.user.id}>`
                }
            );



            function updateButtons(
                object
            ) {

                if (
                    Array.isArray(object)
                ) {

                    for (
                        const item
                        of object
                    ) {

                        updateButtons(
                            item
                        );
                    }

                    return;
                }


                if (
                    !object ||
                    typeof object !== 'object'
                ) {
                    return;
                }


                if (
                    object.type === 2 &&
                    object.custom_id ===
                        'p_342168692009734152'
                ) {

                    object.custom_id =
                        `ally_approve:${interaction.user.id}`;
                }


                if (
                    object.type === 2 &&
                    object.custom_id ===
                        'p_342168695981740041'
                ) {

                    object.custom_id =
                        `ally_decline:${interaction.user.id}`;
                }


                for (
                    const value
                    of Object.values(object)
                ) {

                    if (
                        typeof value === 'object'
                    ) {

                        updateButtons(
                            value
                        );
                    }
                }
            }


            updateButtons(
                data
            );


            await sendComponentsV2(
                channel,
                data
            );


            await interaction.reply({
                content:
                    'Your alliance request has been submitted.',
                ephemeral: true
            });

            return;
        }



        if (
            interaction.isButton() &&
            interaction.customId === 'done'
        ) {

            if (
                !isStaff(interaction)
            ) {

                await interaction.reply({
                    content:
                        'You do not have permission to use this button.',
                    ephemeral: true
                });

                return;
            }


            await interaction.channel.setName(
                'done'
            );


            await interaction.reply({
                content:
                    'Ticket marked as done.',
                ephemeral: true
            });

            return;
        }



        if (
            interaction.isButton() &&
            interaction.customId ===
                'p_342166043143180299'
        ) {

            if (
                !isStaff(interaction)
            ) {

                await interaction.reply({
                    content:
                        'You do not have permission to use this button.',
                    ephemeral: true
                });

                return;
            }


            await showRenameModal(
                interaction
            );

            return;
        }



        if (
            interaction.isButton() &&
            interaction.customId === 'close'
        ) {


            await interaction.deferReply({
                ephemeral: true
            });


            await closeTicket(
                interaction.channel
            );


            await interaction.editReply({
                content:
                    'This ticket has been closed. It will be deleted automatically after 6 hours.'
            });

            return;
        }



        if (
            interaction.isModalSubmit() &&
            interaction.customId ===
                'rename_ticket'
        ) {

            if (
                !isStaff(interaction)
            ) {

                await interaction.reply({
                    content:
                        'You do not have permission to do this.',
                    ephemeral: true
                });

                return;
            }


            let newName =
                interaction.fields
                    .getTextInputValue(
                        'channel_name'
                    )
                    .trim()
                    .toLowerCase();


            newName =
                newName
                    .replace(
                        /[^a-z0-9-_]/g,
                        '-'
                    )
                    .replace(
                        /-+/g,
                        '-'
                    )
                    .slice(
                        0,
                        100
                    );


            if (!newName) {

                await interaction.reply({
                    content:
                        'Invalid channel name.',
                    ephemeral: true
                });

                return;
            }


            await interaction.channel.setName(
                newName
            );


            await interaction.reply({
                content:
                    `Channel renamed to \`${newName}\`.`,
                ephemeral: true
            });

            return;
        }



        if (
            interaction.isButton() &&
            (
                interaction.customId.startsWith(
                    'ally_approve:'
                ) ||
                interaction.customId.startsWith(
                    'ally_decline:'
                )
            )
        ) {

            if (
                !isStaff(interaction)
            ) {

                await interaction.reply({
                    content:
                        'You do not have permission to use this button.',
                    ephemeral: true
                });

                return;
            }


            const approved =
                interaction.customId.startsWith(
                    'ally_approve:'
                );


            const submitterId =
                interaction.customId.split(':')[1];



            const components =
                clone(
                    interaction.message.components
                );


            disableButtons(
                components
            );


            await interaction.message.edit({
                components
            });



            const responseChannel =
                interaction.guild.channels.cache.get(
                    ALLIANCE_RESPONSE_CHANNEL_ID
                );


            if (responseChannel) {

                if (approved) {

                    await responseChannel.send(
                        `> **Hey <@${submitterId}>, Your alliance request has been \`approved\`** <:yes:1543612207990833253>`
                    );

                } else {

                    await responseChannel.send(
                        `> **Hey <@${submitterId}>, Your alliance request has been \`declined\`** <:no:1543612318305226773>`
                    );
                }
            }


            await interaction.reply({
                content:
                    approved
                        ? 'Alliance request approved.'
                        : 'Alliance request declined.',
                ephemeral: true
            });

            return;
        }
    }
};
