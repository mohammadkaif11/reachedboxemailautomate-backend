import { Request, Response } from "express";
import {
  ConfidentialClientApplication,
  Configuration,
} from "@azure/msal-node";
import { db } from "../utils/db";
import { CreateJOBQueueFetchEmailsInput } from "../module";
import { addFetchEmailsJobInterval } from "../worker/queue";

export const outlookAuth = async (req: Request, res: Response) => {
  try {
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI as string;
    const clientId = process.env.OUTLOOK_CLIENT_ID as string;
    const tenantId = process.env.OUTLOOK_TENANT_ID as string;
    const clientSecret= process.env.OUTLOOK_CLIENT_SECRET as string;

    const authority = `https://login.microsoftonline.com/${tenantId}`;
    console.log(redirectUri,clientId,tenantId,authority)

    const msalConfig = {
      auth: {
        clientId: clientId,
        authority: authority,
        redirectUri,
        clientSecret,
      },
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    const authCodeUrlParameters = {
      scopes: ["User.Read", "Mail.Read"],
      redirectUri,
    };

    const redirectURL = await cca.getAuthCodeUrl(authCodeUrlParameters);
    return res.status(300).redirect(redirectURL);
  } catch (error: any) {
    console.log("Error while outlook auth:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const outlookCallback = async (req: Request, res: Response) => {
  try {
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI as string;
    const clientId = process.env.OUTLOOK_CLIENT_ID as string;
    const clientSecret= process.env.OUTLOOK_CLIENT_SECRET as string;
    const tenantId = process.env.OUTLOOK_TENANT_ID as string;
    const authority = `https://login.microsoftonline.com/${tenantId}`;
    const { code } = req.query;

    const tokenRequest = {
      code: code as string,
      scopes: ["User.Read", "Mail.Read"],
      redirectUri,
    };

    const msalConfig: Configuration = {
      auth: {
        clientId: clientId,
        authority: authority,
        clientSecret: clientSecret,
      },
    };


  
    const cca = new ConfidentialClientApplication(msalConfig);
    const data = await cca.acquireTokenByCode(tokenRequest);
    const accessToken = data?.accessToken;
    const userEmail = data?.account?.username;

    const account = await db.account.create({
      data: {
        access_token: accessToken,
        email: userEmail as string,
        name: data?.account?.username ? data?.account?.username : userEmail,
        type: "Outlook",
      },
    });

    //Add the job from queue
    const quequeInput: CreateJOBQueueFetchEmailsInput = {
      id: account.id,
      type: account.type || "",
      accessToken: account?.access_token || "",
      refreshToken: account?.refresh_token || "",
      mail: account.email,
      autoSend: account?.autoSend,
    };

    await addFetchEmailsJobInterval(quequeInput);

    return res
      .status(300)
      .redirect(`${process.env.BASE_URL}/email-accounts?data=success_signed`);
  } catch (error: any) {
    console.log(
      "Error while generating access token for outlook:",
      error.message
    );
    return res
      .status(300)
      .redirect(`${process.env.BASE_URL}/email-accounts?error=InternalError`);
  }
};
