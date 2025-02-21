import { config } from "./config";
import { getRedisClient } from "./redis";

export async function generateOTP(studentNumber: string): Promise<string> {
    // Generate random digits
    let otp: string = '';
    for (let i = 0; i < 6; i++) {
        otp += Math.floor(Math.random() * 10).toString();
    }

    const redis = await getRedisClient();
    
    const key = `otp:${otp}`;
    
    // If the code already exists, generate a new one.
    const existing_otp = await redis.get(key);
    if (existing_otp) return await generateOTP(studentNumber);
    
    await redis.setEx(key, config.OTP_TIMEOUT, studentNumber);
    
    return otp;
}

export async function validateOTP(otp: string) {
    const redis = await getRedisClient();
    return await redis.getDel(`otp:${otp}`)
}
