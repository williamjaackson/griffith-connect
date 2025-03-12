# Griffith Connect

Griffith Connect is a Discord bot designed to verify discord users against their Griffith student numbers. By connecting student numbers to discord accounts, students are held accountable for their behaviours online, encouraging community engagement and streamline communication. This project is built using Node.js and TypeScript, leveraging the Discord.js library.

![Bot Welcome Message](./public/connect.png)

## Integrations / Technologies

- Connects to a PostgreSQL database using Neon Database.
- Utilises Redis for caching.
- Sends emails using Resend API.
- Deploy with confidence, built with Docker Compose.

## Prerequisites

- Node.js
- Docker (optional, for containerised deployment)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/williamjaackson/griffith-connect.git
   cd griffith-connect
   ```

2. Create a `.env` file in the `discord-bot` directory based on the `.env.example` file.

3. Setup `discord-bot/config.json`.

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: The URL for the PostgreSQL database.
- `DISCORD_TOKEN`: The token for your Discord bot.
- `DISCORD_CLIENT_ID`: The client ID for your Discord application.
- `RESEND_API_KEY`: The API key for the Resend service.

## Configuration

The `discord-bot/config.json` file is used to configure various settings for the Griffith Connect bot. Below is the structure of the `config.json` file:

```json
{
   "connectedRole": "DISCORD_ROLE_ID",
   "exemptPingRole": "DISCORD_ROLE_ID",
   "connectMessageLink": "https://discord.com/channels/.../",
   "logChannel": "DISCORD_CHANNEL_ID",
   "guildId": "DISCORD_GUILD_ID",
   "emojiId": "DISCORD_EMOJI_ID"
}
```

- `connectedRole`: The ID of the role assigned to users who have successfully connected their Discord account with their Griffith student number.
- `exemptPingRole`: The ID of the role that gets pinged when someone applies for exemption.
- `connectMessageLink`: A direct link to the message in Discord that users can interact with to start the connection process. This link will be sent in the join message.
- `logChannel`: The ID of the channel where logs and connected student numbers are sent.
- `guildId`: The server ID to handle verifications.
- `emojiId`: The emoji to go next to the connect to sNumber button.

Ensure that the `config.json` file is properly configured before running the bot to avoid any runtime errors.

## Running with Docker

### Install Docker

1. Download and install Docker from the [official website](https://www.docker.com/products/docker-desktop).

2. Follow the installation instructions for your operating system.

### Running the Project with Docker Compose

1. Ensure Docker is running on your machine.

2. Navigate to the project directory:

   ```bash
   cd griffith-connect
   ```

3. Build and start the services defined in the `docker-compose.yaml` file:

   ```bash
   docker compose up --build
   ```

   This command will build the Docker images and start the containers for the application.

4. To stop the services, use:

   ```bash
   docker compose down
   ```

   This will stop and remove the containers, networks, and volumes defined in the `docker-compose.yaml` file.