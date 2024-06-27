import {
  MailType,
  OutLookMail,
  OutLookMailWithCategory,
} from "../module";
import { getMailbyMessageId, saveExtractMails } from "./database";
import { db } from "./db";
import { getCategoryOfMail } from "./open-ai";

export const extractOutlookMail = async (accountId: number,access_token:string|null) => {
  try {
    if(!access_token){
      throw new Error("Access token not found");
    }
    const currentTime = new Date().toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Microsoft Graph API endpoint for fetching inbox messages within the time range
    const endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${tenMinutesAgo}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token as string}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      const mails = data.value as OutLookMail[];
      const filteredMails = await filterOutLookMailAlreadySaveInDb(mails);
      const mailsWithCategory: OutLookMailWithCategory[] = await Promise.all(filteredMails.map(async (mail: OutLookMail) => {
          const categoryLabel =
            (await getCategoryOfMail(mail.bodyPreview, mail.subject)) || "";
          return {
            id: mail.id,
            subject: mail.subject,
            bodyPreview: mail.bodyPreview,
            sender: {
              emailAddress: {
                name: mail.sender.emailAddress.name,
                address: mail.sender.emailAddress.address,
              },
            },
            receivedDateTime: mail.receivedDateTime,
            label: categoryLabel,
          };
        })
      );
      await saveOutLookMailInDB(mailsWithCategory,accountId);
      return mailsWithCategory;
    } else {
      throw new Error(
        `Failed to retrieve outlook emails. Status code: ${response.status}`
      );
    }
  } catch (error: any) {
    console.log(
      `Error while getting outlook mail [getOutlookMail()]  ${error.message}`
    );
    throw new Error(error)
  }
};

export const getIntrestedMail = async (mails: OutLookMailWithCategory[]) => {
  const InterestedMails = mails.filter((mail) => mail?.label === "Interested");
  return InterestedMails;
};

 const saveOutLookMailInDB = async (
  mails: OutLookMailWithCategory[],
  accountId: number
) => {
  const outLookMailSaveData: MailType[] = mails.map((mail) => {
    return {
      messageId: mail.id,
      from: `${mail.sender.emailAddress.name} <${mail.sender.emailAddress.address}>`,
      subject: mail.subject,
      snippet: mail.bodyPreview,
      email: mail.sender.emailAddress.address,
      label: mail.label,
    };
  });
  await saveExtractMails(outLookMailSaveData, accountId);
};

const filterOutLookMailAlreadySaveInDb = async (mails: OutLookMail[]) => {
    try {
      const detailedMails = await Promise.all(
        mails.map(async (mail) => {
          const mailDb = await getMailbyMessageId(mail.id);
          if (mailDb == null) {
            return null;
          } else {
            return mail;
          }
        })
      );
      const validMails = detailedMails.filter((mail) => mail !== null);
      return validMails;
    } catch (error: any) {
      console.log(
        `Error while filter  outlook mail [filterOutLookMailAlreadySaveInDb()]  ${error.message}`
      );
      throw new error();
    }
};
