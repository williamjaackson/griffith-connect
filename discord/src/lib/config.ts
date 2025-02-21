import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadConfig() {
    // Resolve the path relative to the current file
    const configPath = resolve(__dirname, '../../config.json');

    // Read and parse the config file
    const configFile = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configFile);

    return config;
}

// Export a singleton instance of the config
export const config = loadConfig();