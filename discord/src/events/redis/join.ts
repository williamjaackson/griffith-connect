import { Client, EmbedBuilder, Events } from 'discord.js';
import { getRedisClient } from '../../lib/redis';
import { emailTemplate } from '../../lib/resend';
import { config } from '../../lib/config';
import { getDatabaseClient } from '../../lib/database';

export const event = Events.ClientReady;
export const once = true;
export async function execute(client: Client) {
    let redis = await getRedisClient();
    redis = await redis.duplicate();
    await redis.connect();

    const sql = await getDatabaseClient();

    await redis.subscribe('new-member', async (memberDetails: any) => {
        const { campusUser, club } = JSON.parse(memberDetails);

        const [griffithStudent] = await sql('SELECT * FROM griffith_students WHERE student_number = $1', [campusUser.student_number]);
        const [discordMemberData] = await sql('SELECT * FROM discord_members WHERE student_number = $1', [griffithStudent.student_number]);
        
        if (!discordMemberData) {
            await emailTemplate(
                campusUser.email,
                `Griffith ICT Club - Join the Discord`,
                'discord-invite',
                { name: griffithStudent.first_name + ' ' + griffithStudent.last_name }
            );
            return;
        }
        
        const guilds = await client.guilds.fetch(config.GUILD_ID);
        // @ts-ignore hacky bullshit
        const guild = await [...guilds.values()][0].fetch();

        const discordMember = await guild.members.fetch(discordMemberData.id);
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
    });
}