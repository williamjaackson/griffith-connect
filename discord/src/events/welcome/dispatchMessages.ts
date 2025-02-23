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
        console.log('members:', dispatchList)
        await redis.set('welcome:dispatch-list', '[]')

        await Promise.all(dispatchList.map(async (member: any) => {
            const [campusUser] = await sql(`
                SELECT campus_users.* FROM discord_members
                JOIN campus_users ON campus_users.student_number = discord_members.student_number 
                WHERE discord_members.id = $1`, 
                [member]
            );

            if (campusUser) {
                const [club] = await sql(`
                    SELECT clubs.* FROM campus_users
                    JOIN club_members ON club_members.campus_id = campus_users.id
                    JOIN clubs ON clubs.id = club_members.club
                    WHERE campus_users.id = $1
                `, [campusUser.id]);
    
                const [griffithStudent] = await sql(`SELECT * FROM griffith_students WHERE student_number = $1`, [campusUser.student_number]);

                const guilds = await client.guilds.fetch(config.GUILD_ID);
                // @ts-ignore hacky bullshit
                const guild = await [...guilds.values()][0].fetch();
                const discordMember = await guild.members.fetch(member);
                await discordMember.roles.add(config.ROLES.CLUB_MEMBER);
                await discordMember.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('New Club Member')
                        .setColor(0x2b2d31)
                        .setThumbnail('https://i.postimg.cc/mrpv4Mqx/temp-Imagep-ZGw-L0.avif')
                        .setFooter({
                            text: 'Griffith Connect • Powered by Griffith ICT Club <https://wwwgriffithict.com/>'
                        })
                        .setDescription(`Heyo <@${discordMember.id}>! 👋\n\nThank you for joining the **${club.name}**! You've been given club-member access on the discord, and have now been connected as:\n\`\`\`${griffithStudent.first_name} ${griffithStudent.last_name}\`\`\`\n-# This will only ever be viewable by staff and other club members.`)
                    ]
                })
                return;
            }; // user has already joined the club.

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