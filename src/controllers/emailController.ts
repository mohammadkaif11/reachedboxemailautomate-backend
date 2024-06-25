import { Request, Response } from "express";
import { db } from "../utils/db";
import { writeEmail } from "../utils/open-ai";
import { sendingGoogleMail } from "../utils/google";
import {
  addFetchEmailsJobInterval,
  deleteFetchEmailsJob,
} from "../worker/queue";
import {
  CreateJOBQueueFetchEmailsInput,
  SendMailAPIRequestBody,
} from "../module";
import { saveMailReply } from "../utils/database";

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const emailData = await db.account.findMany({});
    return res.status(200).json({ data: emailData });
  } catch (error: any) {
    console.log("Error while getting accounts:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllExtractMails = async (req: Request, res: Response) => {
  try {
    const mailsData = await db.mail.findMany({ include: { account: true } });
    return res.status(200).json({ data: mailsData });
  } catch (error: any) {
    console.log("Error while getting Mails:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMailReply = async (req: Request, res: Response) => {
  try {
    const mailReplys = await db.mailReply.findMany({
      include: { account: true },
    });
    return res.status(200).json({ data: mailReplys });
  } catch (error: any) {
    console.log("Error while getting Mails:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateAutoSend = async (req: Request, res: Response) => {
  try {
    const { id, autoSend } = req.body;
    if (!id || autoSend == null) {
      throw new Error("Id and autoSend are required");
    }
    const accountdb = await db.account.findFirst({ where: { id: id } });

    if (!accountdb) {
      throw new Error("Account not found");
    }

    const account = await db.account.update({
      data: { autoSend: autoSend },
      where: { id: id },
    });

    const quequeInput: CreateJOBQueueFetchEmailsInput = {
      id: account.id,
      type: account.type || "",
      accessToken: account?.access_token || "",
      refreshToken: account?.refresh_token || "",
      mail: account.email,
      autoSend: account?.autoSend,
    };

    const jobId = String(account.id);
    await deleteFetchEmailsJob(jobId);

    await addFetchEmailsJobInterval(quequeInput);

    res.status(200).json({ data: "success" });
  } catch (error) {
    console.log("Error while updating Auto Reply Status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const generateMailReply = async (req: Request, res: Response) => {
  try {
    const mailId = req.params.id;

    if (!mailId) {
      throw new Error("MailId is required");
    }

    const mail = await db.mail.findUnique({
      where: { id: mailId },
      include: { account: true },
    });

    if (!mail) {
      throw new Error("Mail Not found");
    }

    const generatedMailString = await writeEmail(
      mail?.snippet as string,
      mail?.subject as string,
      mail?.from as string
    );

    if (!generatedMailString) {
      throw new Error("AI Failed to generate email");
    }

    const sanitizedMailString = generatedMailString.replace(/\n/g, "\\n");
    const parseGeneratedMail = JSON.parse(sanitizedMailString);

    return res.status(200).send({ data: parseGeneratedMail, mail });
  } catch (error) {
    console.log("Error while generating mail Reply:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendEmailToUser = async (req: Request, res: Response) => {
  try {
    const data: SendMailAPIRequestBody = req.body;
    if (data.AIResponse.mail.account.type == "Gmail") {
      //Send email to user
      await sendingGoogleMail(
        data.AIResponse.mail.account.refresh_token,
        data.AIResponse.mail.email,
        data.AIResponse.mail.account.email,
        data.AIResponse.data.subject,
        data.AIResponse.data.content
      );

      //save reply Mail In Database
      await saveMailReply(
        data.AIResponse.mail.email,
        data.AIResponse.mail.account.email,
        data.AIResponse.data.subject,
        data.AIResponse.data.content
      );
    } else {
      // handle other email providers
    }
    res.status(200).send({ data: "Send Mail successfully" });
  } catch (error) {
    console.log("Error while sending mail to User:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
