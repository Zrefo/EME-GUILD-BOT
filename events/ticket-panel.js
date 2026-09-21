const { Events } = require('discord.js');

const fs = require('fs');
const path = require('path');

const messagesPath = path.join(
    __dirname,
    '..',
    'messages'
);

function loadMessage(fileName) {

    const filePath = path.join(
        messagesPath,
        fileName
    );

    return JSON.parse(
        fs.readFileSync(
            filePath,
            'utf8'
        )
    );
}

module.exports = {

    name: Events.MessageCreate,

    async execute(message) {

        if (message.author.bot) {
            return;
        }

        if (
            message.content.toLowerCase() !==
            '$ticket-zrefo'
        ) {
            return;
        }

        try {

            const data =
                loadMessage(
                    'ticket-panel.json'
                );

            await message.channel.send({
                flags: data.flags,
                components: data.components
            });

        } catch (error) {

            console.error(
                'Failed to send ticket panel:',
                error
            );
        }
    }
};
