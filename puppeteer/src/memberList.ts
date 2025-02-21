import puppeteer from "puppeteer";
import { sessionCookies } from "./auth";
import axios from "axios";
import csvToJson from "./lib/csv";
import { getMongoClient } from "./lib/mongo";

export async function updateMemberList() {
    const browser = await puppeteer.launch();

    const cookies = await sessionCookies();
    let cookieString = '';
    
    // set cookies and build cookie string
    for (const cookie of cookies) {
        await browser.setCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain
        });
        cookieString += cookie.name + '=' + cookie.value + '; '
    }

    const page = await browser.newPage();
    await page.goto('https://griffith.campusgroups.com/groups')
    await page.goto('https://griffith.campusgroups.com/officer_login_redirect?club_id=24237')
    await page.goto('https://griffith.campusgroups.com/members_list?status=members')
    await page.close()

    const response = await axios.get(
        'https://griffith.campusgroups.com/mobile_ws/v17/mobile_manage_members',
        {
            params: {
                range: 0,
                limit: '',
                filter1: 'members',
                filter4_contains: 'undefined',
                filter4_notcontains: 'undefined',
                filter6_contains: 'OR',
                filter6_notcontains: 'OR',
                filter9_contains: 'undefined',
                filter9_notcontains: 'undefined',
                order: '',
                search_word: '',
                mode: '',
                update: 7,
                select_all: 1,
                checkbox_ids: '',
                actionParam: 'undefined'
            },
            headers: {
                Cookie: cookieString
            }
        }
    );
    
    // response.data is CSV, convert it to JSON
    const json = csvToJson(response.data);
    await browser.close();

    const members = json;
    const mongo = await getMongoClient()
    const colCampusUsers = mongo.db('griffith-connect').collection('campus-users')

    members.forEach((member: any) => {
        const studentNumber = member['Email'].match(/s\d{7}/)?.[0] || '';
        colCampusUsers.insertOne({
            studentNumber,
            userId: member['User Identifier'],
            memberId: member['Member Identifier'],
            firstName: member['First Name'],
            lastName: member['Last Name'],
            email: member['Email'],
            accountType: member['Account Type'],
            signupDate: member['Signup Date']
        })
    })

    return json;
}

export async function memberList() {
    const mongo = await getMongoClient()
    const colCampusUsers = mongo.db('griffith-connect').collection('campus-users')

    const members = await colCampusUsers.find({}).toArray();
    
    return members;
}