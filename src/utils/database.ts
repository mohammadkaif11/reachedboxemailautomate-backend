import { MailType } from "../module";
import { db } from "./db";

export const saveExtractMails = async (
  mails: MailType[],
  accountId: number
) => {
  try {
    if (mails.length === 0) {
      console.log("[saveExtractMails] No mails to save.");
      return;
    }
    const mailRecords = mails.map((mail) => ({
      messageId: mail.messageId,
      from: mail.from,
      subject: mail.subject,
      snippet: mail.snippet,
      email: mail.email,
      label: mail.label,
      accountId: accountId,
    }));

    await db.mail.createMany({
      data: mailRecords,
    });

    console.log(
      `[saveExtractMails] Successfully saved ${mails.length} mails to Prisma.`
    );
  } catch (error) {
    console.error(
      `[saveExtractMails] Error while saving mails to Prisma:`,
      error
    );
    throw error;
  }
};

export async function getMailbyMessageId(messageId: string) {
  try {
    const message = await db.mail.findFirst({
      where: { messageId: messageId },
    });
    if (!message) {
      console.log(
        `[getMailbyMessageId] No message found with messageId ${messageId}.`
      );
    }
    return message;
  } catch (error) {
    console.error(
      `[getMailbyMessageId] Error while fetching message by messageId ${messageId}:`,
      error
    );
    throw error;
  }
}
