import { Client, Collection, EmbedBuilder, Events, OAuth2Guild } from 'discord.js';
import { getRedisClient } from '../../lib/redis';
import { getMongoClient } from '../../lib/mongo';
import { emailTemplate } from '../../lib/resend';
import { config } from '../../lib/config';

export const event = Events.ClientReady;
export const once = true;
export async function execute(client: Client) {
    const redis = await getRedisClient();
    const mongo = await getMongoClient();
    // const colCampusUsers = mongo.db('griffith').collection('campusUsers');
    const colDiscordUsers = mongo.db('griffith-connect').collection('discord-users');

    await redis.subscribe('new-members', async (message: any) => {
        const data = JSON.parse(message);
        data.members.forEach(async (member: any) => {
            const discordUserData = await colDiscordUsers.findOne({ studentNumber: member.studentNumber })
            if (!discordUserData) {
                return await emailTemplate(
                    member.email,
                    `Griffith ICT Club - Join the Discord`,
                    'discord-invite',
                    { name: member.firstName + ' ' + member.lastName }
                )
            }
            const guilds = await client.guilds.fetch(config.GUILD_ID);
            // @ts-ignore
            const guild = await [...guilds.values()][0].fetch();

            // gold coast if 'GIC'
            let clubLocation = '';
            // if 'GIC' in clubs
            if (member.clubs.includes('GIC')) {
                clubLocation = ' (Gold Coast)';
            } else if (member.clubs.includes('GICT')) {
                clubLocation = ' (Brisbane/Online)'
            };


            const discordMember = await guild.members.fetch(discordUserData.discordUser);
            await discordMember.roles.add(config.ROLES.CLUB_MEMBER);
            await discordMember.send({
                embeds: [new EmbedBuilder()
                    .setTitle('New Club Member')
                    .setColor(0x2b2d31)
                    .setThumbnail('https://i.postimg.cc/mrpv4Mqx/temp-Imagep-ZGw-L0.avif')
                    .setFooter({
                        text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
                    })
                    .setDescription(`Heyo <@${discordMember.id}>! 👋\n\nThank you for joining the **Griffith ICT Club${clubLocation}**! You've been given club-member access on the discord, and have now been connected as:\n\`\`\`${member.firstName} ${member.lastName}\`\`\`\n-# This will only ever be viewable by staff and other club members.`)
                ]
            })
        });
    });
}