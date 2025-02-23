import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events } from 'discord.js';
import { getRedisClient } from '../../lib/redis';
import { emailTemplate } from '../../lib/resend';
import { config } from '../../lib/config';
import { getDatabaseClient } from '../../lib/database';

export const event = Events.ClientReady;
export const once = true;
export async function execute(client: Client) {
    const sql = await getDatabaseClient();
    const redis = await getRedisClient();
    const redisSub = await redis.duplicate();
    await redisSub.connect();

    await redisSub.subscribe('updated-members', async () => {
        const dispatchList = JSON.parse(await redis.get('welcome:dispatch-list') || '[]')
        await redis.set('welcome:dispatch-list', '[]')

        await Promise.all(dispatchList.map(async (member: any) => {
            const [campusUser] = await sql(`
                SELECT campus_users.* FROM discord_members
                JOIN campus_users ON campus_users.student_number = discord_members.student_number 
                WHERE discord_members.id = $1`, 
                [member]
            );
            if (campusUser) return; // user has already joined the club.

            const discordUser = await client.users.fetch(member);
            if (!discordUser) return;

            await discordUser.send({
                embeds: [new EmbedBuilder()
                    .setTitle('Become a Club Member')
                    .setColor(0x2b2d31)
                    .setThumbnail('https://i.postimg.cc/mrpv4Mqx/temp-Imagep-ZGw-L0.avif')
                    .setFooter({
                        text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
                    })
                    .setDescription(`Heyo <@${member}>! 👋\n\nI noticed you aren't a Club Member yet! We'd love to have you as a member.`)
                    .addFields([{
                        name: 'Why should I join?',
                        value: `- Exclusive club-only chat channels; and\n- Exciting events like hackathons and CTF competitions; and\n- A great community where you can meet and connect with like-minded people; and\n- it's FREE!`
                    },{
                        name: 'Ready to join?',
                        value: `You can sign up through Griffith CampusGroups - just select your campus:`
                    }])
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel('Gold Coast')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://griffith.campusgroups.com/GIC/club_signup'),
                    new ButtonBuilder()
                        .setLabel('Brisbane/Online')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://griffith.campusgroups.com/GICT/club_signup'),
                    new ButtonBuilder()
                        .setCustomId('welcome/link/club-invite:0')
                        .setLabel(`I'm already a Club Member`)
                        .setStyle(ButtonStyle.Danger)
                )]
            }).catch(() => {});
        }));
    });
}