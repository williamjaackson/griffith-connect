import axios from "axios";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('members')
    .setDescription('Fetch Members');

async function getMemberList() {
    try {
        const response = await axios.get('http://puppeteer:3000/members');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch member list:', error);
        throw error;
    }
}
      
// Example Discord command using the member list
export async function execute(interaction: CommandInteraction) {
    try {
        await interaction.deferReply();
        const members = await getMemberList();
        
        // Format the response as needed
        const formattedList = members.map((member: any) => `${member.firstName} ${member.lastName}`).join('\n');
          
        await interaction.editReply({
            content: `Member List:\n${formattedList}`
        });
    } catch (error) {
        await interaction.editReply({
            content: 'Failed to fetch member list. Please try again later.'
        });
    }
}