import { Resend } from "resend";
import { promises as fs } from "fs";
import path from "path";

export const resend = new Resend(process.env.RESEND_API_KEY);

async function formatTemplate(
  templateName: string,
  variables: { [key: string]: string },
  type: "text" | "html",
): Promise<string> {
  try {
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      type === "text" ? "txt" : "html",
      `${templateName}.${type === "text" ? "txt" : "html"}`,
    );

    const content = await fs.readFile(filePath, "utf8");

    return Object.entries(variables).reduce((formatted, [key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      return formatted.replace(regex, value);
    }, content);
  } catch (error) {
    console.error(`Error reading/formatting ${type} template:`, error);
    return "";
  }
}

export async function emailTemplate(
  email: string,
  subject: string,
  templateName: string,
  variables: { [key: string]: string },
): Promise<void> {
  // Format both templates concurrently
  const [formattedText, formattedHtml] = await Promise.all([
    formatTemplate(templateName, variables, "text"),
    formatTemplate(templateName, variables, "html"),
  ]);

  // Send email
  const response = await resend.emails.send({
    from: "Griffith ICT Club <no-reply@griffithict.com>",
    to: [email],
    subject: subject,
    text: formattedText,
    html: formattedHtml || formattedText, // Fallback to text if no HTML
  });
}
