import puppeteer from "puppeteer";
import { TOTP } from "totp-generator";
import { getMongoClient } from "./lib/mongo";

async function loginFlow(student_id: string, password: string, otp_id: string, otp_secret: string) {
    const browser = await puppeteer.launch();
    const page    = await browser.newPage();
    
    // Navigate to Campus Groups login page
    await page.goto('https://www.campusgroups.com/shibboleth/login?idp=griffith&school=griffith')
    
    await page.type('#username', student_id);
    await page.type('#password', password);
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation();
    await page.waitForNavigation();
    await page.waitForNavigation();
    
    // Navigate to PingID's device list
    await page.goto('https://authenticator.pingone.com.au/pingid/ppm/devices')
    
    await page.click(`[data-id="${otp_id}"]`);
    await page.click('#device-submit')
    
    await page.waitForNavigation();
    await page.waitForNavigation();
    
    // Enter PingID OTP
    const { otp } = TOTP.generate(otp_secret, { digits: 6 });
    
    await page.type('#otp', otp);
    await page.click('input[type="submit"]')
    
    await page.waitForNavigation();
    await page.waitForNavigation();
    await page.waitForNavigation();
    await page.waitForNavigation();
    
    // Get cookies
    const browser_cookies = await browser.cookies();
    await browser.close();

    return browser_cookies.filter(cookie => cookie.domain == 'griffith.campusgroups.com')
}

async function sessionCookies() {
    // const data = await col_cookies.findOne({});

    // if (data) {
    //     if (Date.now() - data.timestamp < parseInt(process.env.SESSION_CACHE_DURATION ?? '0') * 1000) {
    //         return data.cookies;
    //     }
    // }
    const cookies = await loginFlow(
        process.env.GRIFFITH_USERNAME!,
        process.env.GRIFFITH_PASSWORD!,
        process.env.OTP_ID!,
        process.env.OTP_SECRET!
    );

    // await col_cookies.updateOne({}, { $set: { cookies, timestamp: Date.now() } }, { upsert: true });

    return cookies;
}

export { sessionCookies }