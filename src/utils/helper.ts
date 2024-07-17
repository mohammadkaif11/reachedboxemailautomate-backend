import { parse } from "dotenv";
import { MaiLReplyJobInputData } from "../module";
import { saveMailReply } from "./database";
import { sendingGoogleMail } from "./google";
import { writeEmail } from "./open-ai";
import { sendingOutLookiEmail } from "./outlook";

export function extractEmailAddress(input: string): string | null {
  const regex = /<([^>]+)>/;

  const match = input.match(regex);

  return match ? match[1] : null;
}

export async function createMessage(
  sender: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const emailLines = [];
  emailLines.push(`From: ${sender}`);
  emailLines.push(`To: ${to}`);
  emailLines.push("Content-Type: text/html; charset=utf-8");
  emailLines.push(`MIME-Version: 1.0`);
  emailLines.push(`Subject: ${subject}`);
  emailLines.push("");
  emailLines.push(body);

  const email = emailLines.join("\r\n").trim();

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return encodedEmail;
}

export async function genrateEmailReplyandSendToUser(
  data: MaiLReplyJobInputData
) {
  try {
    const interestedMail = data.mail;
    const user = data.account;

    const mailContentString = await writeEmail(
      interestedMail.snippet,
      interestedMail.subject,
      interestedMail.from
    );

    if (!mailContentString) {
      throw new Error("Mail contnent not found");
    }

    const sanitizedMailString = mailContentString.replace(/\n/g, "\\n");
    const parseGeneratedMail = JSON.parse(sanitizedMailString);

    if (user.type == "Gmail") {
      await sendingGoogleMail(
        user.refresh_token as string,
        interestedMail.email,
        user.email,
        parseGeneratedMail.subject as string,
        parseGeneratedMail.content as string
      );
    } else if (user.type == "OutLook") {
      await sendingOutLookiEmail(
        user.access_token as string,
        interestedMail.email,
        parseGeneratedMail.subject as string,
        parseGeneratedMail.content as string
      );
    }
   await saveMailReply(
      interestedMail.email,
      user.id,
      parseGeneratedMail.subject,
      parseGeneratedMail.content
    );
    console.log('[reply send successfully]')
  } catch (error) {
    console.log("[Error in genrateEmailReplyandSendToUser()]: " + error);
  }
}
