import puppeteer from "puppeteer";
import { sessionCookies } from "./auth";
import axios from "axios";
import csvToJson from "./lib/csv";
import { getRedisClient } from "./lib/redis";
import { getDatabaseClient } from "./lib/database";

export async function updateMembers() {
    console.log('updateMembers()')
    const redis = await getRedisClient();
    
    const isUpdatingLock = await redis.get('lock:updating_members');
    if (isUpdatingLock) {
        console.log('currently on lock. exiting...')
        return;
    }
    
    await redis.set('lock:updating_members', '1', { EX: 300 });
    
    console.log('finding cookies...')
    const cookies = await sessionCookies();
    console.log('found cookies.')
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
    console.log('browser cookies.')

    
    const sql = await getDatabaseClient();
    // const snapshot = await sql('SELECT * FROM campus_users');
    
    const clubs = await sql('SELECT * FROM clubs');

    console.log('clubs', clubs)

    
    // needs to run in-order because of state-dependant session cookies.
    for (const club of clubs) {
        console.log('setting session', club.acronym)
        
        const page = await browser.newPage();
        await page.goto('https://griffith.campusgroups.com/groups', {timeout: 0});
        await page.goto(`https://griffith.campusgroups.com/officer_login_redirect?club_id=${club.id}`, {timeout: 0});
        await page.goto('https://griffith.campusgroups.com/members_list?status=members', {timeout: 0});
        await page.close();
        console.log('page closed', club.acronym)
        
        const response = await axios.get(
            'https://griffith.campusgroups.com/mobile_ws/v17/mobile_manage_members?range=0&limit=&filter1=members&filter4_contains=undefined&filter4_notcontains=undefined&filter6_contains=OR&filter6_notcontains=OR&filter9_contains=undefined&filter9_notcontains=undefined&order=&search_word=&mode=&update=7&select_all=1&checkbox_ids=&actionParam=undefined',
            { headers: { Cookie: cookieString } }
        );
        console.log('response downloaded', club.acronym)
        
        const clubMembers = csvToJson(response.data);
        const newMembers = [];
        
        console.log('uploading members', club.acronym)
        await Promise.all(clubMembers.map(async (clubMember: any) => {
            const [existingClubMember] = await sql('SELECT * FROM club_members WHERE id = $1', [clubMember['Member Identifier']]);
            if (existingClubMember) return;
            
            const [campusUser] = await sql('SELECT * FROM campus_users WHERE id = $1', [clubMember['User Identifier']]);
            if (!campusUser) {
                // if available, take the student number from emails like: s5424018@griffithuni.edu.au
                const studentNumber = clubMember['Email'].match(/(s\d{7})@griffithuni.edu.au/)?.[1] || null;
                
                if (studentNumber) {
                    await sql('INSERT INTO griffith_students (student_number, first_name, last_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
                        studentNumber,
                        clubMember['First Name'],
                        clubMember['Last Name']
                    ])
                }
                
                const [campusUser] = await sql('INSERT INTO campus_users (id, student_number, email) VALUES ($1, $2, $3) RETURNING *', [
                    clubMember['User Identifier'],
                    studentNumber,
                    clubMember['Email']
                ]);
                
                // the user joined their first club with us.
                console.log('found new member', club.acronym)

                await redis.publish('new-member', JSON.stringify({
                    campusUser,
                    club: club
                }))
            }
            
            await sql('INSERT INTO club_members (id, campus_id, club) VALUES ($1, $2, $3)', [
                clubMember['Member Identifier'],
                clubMember['User Identifier'],
                club.id
            ]);
        }))
    }
    
    console.log('done updating members')
    await redis.del('lock:updating_members');
    await redis.publish('updated-members', '1')
}