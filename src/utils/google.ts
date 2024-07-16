import { gmail_v1, google } from "googleapis";
import { getMailbyMessageId, saveExtractMails } from "./database";
import { createMessage, extractEmailAddress } from "./helper";
import { getCategoryOfMail, writeEmail } from "./open-ai";
import { addMailIntoQueue, taskQueue } from "../worker/queue";
import { Mail, SendReplyJobInputData } from "../module";

export const extractGoogleMail = async (
  refresh_token: string | null,
  accountId: number
) => {
  try {
    if (!refresh_token) {
      throw new Error("Refresh token is required");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.Redirect_URI}/api/google/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: refresh_token,
    });

    const gmailClient = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    //Gmail API
    const before = Math.floor(new Date().getTime() / 1000);
    const after = Math.floor((new Date().getTime() - 10 * 60 * 1000) / 1000);
    const query = `after:${after} before:${before}`;

    const res = await gmailClient.users.messages.list({
      userId: "me",
      q: query,
      labelIds: ["INBOX"],
    });

    const messages = res.data.messages || [];

    if (messages.length === 0) {
      return [];
    }

    const validGmails=await filterGmailAlreadySaveInDb(messages);
    const detailedGmails = await getEachGmailInDetail(validGmails,gmailClient);
    await saveExtractMails(detailedGmails, accountId);
   
    return detailedGmails;
  } catch (error) {
    console.error("Error while getting gmail [extractGoogleMail()]", error);
    throw error;
  }
};

export const sendingGoogleMail = async (
  refresh_token: string,
  reciverEmail: string,
  senderEmail: string,
  subject: string,
  content: string
) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.Redirect_URI}/api/google/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: refresh_token,
    });

    const gmailClient = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const encodedMessage = await createMessage(
      senderEmail,
      reciverEmail,
      subject,
      content
    );

    await gmailClient.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log("[Sucesssfully send mail google]");
  } catch (error) {
    console.error("[Send google mail] Error:", error);
    throw error;
  }
};

export const  generateEmailsAndSaveIntoQueue =async (
  data: SendReplyJobInputData
) => {
  const interestedMails = data.mails;
  const user = data.user;

  interestedMails.forEach(async (interestedMail) => {
    try {
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

      const queueData = {
        fromEmail: interestedMail.email,
        subject: parseGeneratedMail.subject as string,
        content: parseGeneratedMail.content as string,
        user: user,
      };

      await addMailIntoQueue(queueData);
    } catch (error) {
      console.error(
        `[generateEmailsAndSaveIntoQueue] Error processing mail for ${interestedMail.email}:`,
        error
      );
    }
  });
};

export const FilterIntrestedMail = (gmails: Mail[]) => {
  const InterestedGmail = gmails.filter(
    (gmail) => gmail?.label === "Interested"
  );
  return InterestedGmail;
};

const getGoogleMailDetailsbyMessageId = async (
  gmailClient: any,
  messageId: string
) => {
  try {
    const res = await gmailClient.users.messages.get({
      userId: "me",
      id: messageId,
    });
    const headers = res.data.payload.headers;

    const subject: string =
      headers.find((header: any) => header.name === "Subject")?.value || "";
    const from: string =
      headers.find((header: any) => header.name === "From")?.value || "";
    const snippet: string = res.data.snippet || "";
    const email: string | null = extractEmailAddress(from) || "";
    const categoryLabel: string | null =
      (await getCategoryOfMail(snippet, subject)) || "";
    return {
      messageId,
      from,
      subject,
      snippet,
      email,
      label: categoryLabel,
    };
  } catch (error) {
    console.error(
      `[getGoogleMailDetailsbyMessageId] Error while fetching message details for messageId ${messageId}:`,
      error
    );
    throw error;
  }
};

const filterGmailAlreadySaveInDb = async (mails: gmail_v1.Schema$Message[]) => {
  const mailCheckInDb = await Promise.all(
    mails.map(async (mail) => {
      if (mail.id) {
        const messagedb = await getMailbyMessageId(mail.id);
        if (messagedb) {
          return null;
        } else {
          return mail;
        }
      } else {
        return null;
      }
    })
  );
  const validGmail = mailCheckInDb.filter((mail) => mail !== null);

  return validGmail;
};

const getEachGmailInDetail = async (
  mails: gmail_v1.Schema$Message[],
  gmailClient: any
) => {
  const mailDetails = await Promise.all(
    mails.map(async (message) => {
      const details = await getGoogleMailDetailsbyMessageId(
        gmailClient,
        message.id as string
      );
      return details;
    })
  );
  return mailDetails;
};
