import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, GuildMember } from "discord.js";


export const event = Events.GuildMemberAdd;
export const once  = false;

export async function execute(member: GuildMember) {
    await member.send({
        embeds: [new EmbedBuilder()
            .setTitle('Welcome')
            .setColor(0x2b2d31)
            .setThumbnail('https://i.postimg.cc/xjkhPdbP/griffith-connect.png')
            .setFooter({
                text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
            })
            .setDescription(`Heyo <@${member.id}>! 👋\n\nThank you for joining. Before you can chat in the server you'll need to verify/connect your __Griffith sNumber__. Click the button below to get started.`)
        ],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel('Go to verification.')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1214387742293626940/1257896790934421535/1343079672791040060')
        )]
    }).catch(() => {})
}