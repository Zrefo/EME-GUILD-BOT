require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const {
    token,
    clientId,
    guildId
} = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();


const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

const slashCommands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        slashCommands.push(command.data.toJSON());

        console.log(`Loaded command: /${command.data.name}`);
    }
}

const eventsPath = path.join(__dirname, 'events');

const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || !event.execute) {
        console.log(`Invalid event: ${file}`);
        continue;
    }

    if (event.once) {
        client.once(event.name, (...args) => {
            event.execute(...args);
        });
    } else {
        client.on(event.name, (...args) => {
            event.execute(...args);
        });
    }

    console.log(`Loaded event: ${event.name}`);
}

try {
    const {
        attachDiscordBridge
    } = require('./minecraft/bridge');

    attachDiscordBridge(client);

    console.log('[BRIDGE] Minecraft ↔ Discord bridge uruchomiony.');
} catch (error) {
    console.error(
        '[BRIDGE] Nie udało się uruchomić Minecraft bridge:',
        error
    );
}

client.on('interactionCreate', async interaction => {

    if (interaction.isButton()) {

        if (!interaction.customId.startsWith('giveaway_enter_')) {
            return;
        }

        const giveawayId = interaction.customId.replace(
            'giveaway_enter_',
            ''
        );

        const giveawayCommand = client.commands.get('giveaway');

        if (!giveawayCommand || !giveawayCommand.giveaways) {
            return;
        }

        const giveaway = giveawayCommand.giveaways.get(giveawayId);

        if (!giveaway) {
            return interaction.reply({
                content: 'This giveaway has already ended.',
                ephemeral: true
            });
        }

        if (giveaway.participants.has(interaction.user.id)) {

            giveaway.participants.delete(interaction.user.id);

            return interaction.reply({
                content: 'You left the giveaway.',
                ephemeral: true
            });
        }

        giveaway.participants.add(interaction.user.id);

        return interaction.reply({
            content: 'You entered the giveaway! 🎉',
            ephemeral: true
        });
    }



    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = client.commands.get(
        interaction.commandName
    );

    if (!command) {
        return;
    }

    try {

        await command.execute(interaction);

    } catch (error) {

        console.error(error);

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp({
                content: 'An error occurred while executing this command.',
                ephemeral: true
            });

        } else {

            await interaction.reply({
                content: 'An error occurred while executing this command.',
                ephemeral: true
            });

        }
    }
});



const rest = new REST({
    version: '10'
}).setToken(token);


async function registerCommands() {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                clientId,
                guildId
            ),
            {
                body: slashCommands
            }
        );

        console.log('Slash commands registered.');

    } catch (error) {

        console.error(
            'Command registration error:',
            error
        );
    }
}



client.once('ready', async () => {

    console.log(
        `Logged in as ${client.user.tag}`
    );

    await registerCommands();
});



client.on('error', error => {

    console.error(
        'Discord client error:',
        error
    );
});


client.on('warn', warning => {

    console.warn(
        'Discord warning:',
        warning
    );
});



client.login(token);


