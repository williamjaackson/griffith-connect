import puppeteer from "puppeteer";
import { TOTP } from "totp-generator";
import { getRedisClient } from "./lib/redis";

async function loginFlow(student_id: string, password: string, otp_id: string, otp_secret: string) {
    const browser = await puppeteer.launch();
    const page    = await browser.newPage();
    
    // Navigate to Campus Groups login page
    await page.goto('https://www.campusgroups.com/shibboleth/login?idp=griffith&school=griffith', {timeout: 0})
    
    await page.type('#username', student_id);
    await page.type('#password', password);
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    
    // Navigate to PingID's device list
    await page.goto('https://authenticator.pingone.com.au/pingid/ppm/devices', {timeout: 0})
    
    await page.click(`[data-id="${otp_id}"]`);
    await page.click('#device-submit')
    
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    
    // Enter PingID OTP
    const { otp } = TOTP.generate(otp_secret, { digits: 6 });
    
    await page.type('#otp', otp);
    await page.click('input[type="submit"]')
    
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    await page.waitForNavigation({timeout: 0});
    
    // Get cookies
    const browser_cookies = await browser.cookies();
    await browser.close();

    return browser_cookies.filter(cookie => cookie.domain == 'griffith.campusgroups.com')
}

async function sessionCookies() {
    const redis = await getRedisClient();

    const cachedCookies = await redis.get('cookies');
    if (cachedCookies) {
        return JSON.parse(cachedCookies);
    }
    
    const cookies = await loginFlow(
        process.env.GRIFFITH_USERNAME!,
        process.env.GRIFFITH_PASSWORD!,
        process.env.OTP_ID!,
        process.env.OTP_SECRET!
    );
    
    await redis.setEx('cookies', 1800, JSON.stringify(cookies));
    return cookies;
}

export { sessionCookies }