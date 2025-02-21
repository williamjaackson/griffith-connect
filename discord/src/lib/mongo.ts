import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

export async function getMongoClient() {
    if (client) return client;

    client = new MongoClient(process.env.MONGO_URI!)

    return client;
}