import puppeteer from "puppeteer";
import { sessionCookies } from "./auth";
import axios from "axios";
import csvToJson from "./lib/csv";
import { getMongoClient } from "./lib/mongo";
import { getRedisClient } from "./lib/redis";

export async function updateMembers() {
    const cookies = await sessionCookies();
    let cookieString = '';
    
    const browser = await puppeteer.launch();
    
    for (const cookie of cookies) {
        await browser.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain
        });
        cookieString += cookie.name + '=' + cookie.value + '; '
    }
    
    const mongo = await getMongoClient();
    const colCampusUsers = mongo.db('griffith-connect').collection('campus-users');
    const snapshot = await colCampusUsers.find({}).toArray();
    await colCampusUsers.deleteMany({})
    
    const clubs = [{
        name: 'GIC',
        id: '24237'
    },{
        name: 'GICT',
        id: '24236'
    }];
    
    const memberCache: any = [];
    
    // Process clubs sequentially using for...of to ensure proper async handling
    for (const club of clubs) {
        const page = await browser.newPage();
        await page.goto('https://griffith.campusgroups.com/groups');
        await page.goto(`https://griffith.campusgroups.com/officer_login_redirect?club_id=${club.id}`);
        await page.goto('https://griffith.campusgroups.com/members_list?status=members');
        await page.close();
        
        const response = await axios.get(
            'https://griffith.campusgroups.com/mobile_ws/v17/mobile_manage_members?range=0&limit=&filter1=members&filter4_contains=undefined&filter4_notcontains=undefined&filter6_contains=OR&filter6_notcontains=OR&filter9_contains=undefined&filter9_notcontains=undefined&order=&search_word=&mode=&update=7&select_all=1&checkbox_ids=&actionParam=undefined',
            { headers: { Cookie: cookieString } }
        );
        
        const members = csvToJson(response.data);
        
        // Use Promise.all for parallel processing of member insertions
        await Promise.all(members.map(async (member: any) => {
            const studentNumber = member['Email'].match(/s\d{7}/)?.[0] || null;
            if (memberCache.includes(member['User Identifier'])) {
                await colCampusUsers.updateOne({ userId: member['User Identifier'] }, { $push: { club: club.name } as any });
                return;
            }
            memberCache.push(member['User Identifier']);
            await colCampusUsers.insertOne({
                studentNumber,
                userId: member['User Identifier'],
                memberId: member['Member Identifier'],
                firstName: member['First Name'],
                lastName: member['Last Name'],
                email: member['Email'],
                accountType: member['Account Type'],
                signupDate: member['Signup Date'],
                club: [club.name]
            });
        }));
    }
    
    const members = await colCampusUsers.find({}).toArray();
    
    const newMembers = members.filter(member => !snapshot.find(snapshotMember => snapshotMember.userId === member.userId));
    // console.log('newMembers', newMembers)
    // for member in new members, check if they are verified in the discord server. if they are give them the Club Member role.
    if (newMembers.length > 0) {
        const redis = await getRedisClient();
        await redis.publish('new-members', JSON.stringify({
            type: 'NEW_MEMBERS',
            members: newMembers
        }));
        return;
    }
}