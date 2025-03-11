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
   git clone https://github.com/williamjaackson/griffith-connect
   cd griffith-connect
   ```

2. Create a `.env` file in the `discord-bot` directory based on the `.env.example` file.

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: The URL for the PostgreSQL database.
- `DISCORD_TOKEN`: The token for your Discord bot.
- `DISCORD_CLIENT_ID`: The client ID for your Discord application.
- `RESEND_API_KEY`: The API key for the Resend service.

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