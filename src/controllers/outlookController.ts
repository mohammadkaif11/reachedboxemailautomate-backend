import { Request, Response } from "express";
import { PublicClientApplication } from "@azure/msal-node";
import { db } from "../utils/db";
import { CreateJOBQueueFetchEmailsInput } from "../module";
import { addFetchEmailsJobInterval } from "../worker/queue";
const scopes = ["https://graph.microsoft.com/.default"];

export const outlookAuth = async (req: Request, res: Response) => {
  try {
    const redirectUri = `${process.env.Redirect_URI}/api/outlook/callback`;
    const msalConfig = {
      auth: {
        clientId: process.env.Outlook_Client_ID as string,
        authority: `https://login.microsoftonline.com/${
          process.env.Outlook_TENENT_ID as string
        }`,
        redirectUri,
      },
    };
    const pca = new PublicClientApplication(msalConfig);

    const authCodeUrlParameters = {
      scopes,
      redirectUri,
    };
    const redirectURL = await pca.getAuthCodeUrl(authCodeUrlParameters);
    return res.status(300).redirect(redirectURL);
  } catch (error: any) {
    console.log("Error while outlook auth:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const outlookCallback = async (req: Request, res: Response) => {
  try {
    console.log('outlook callback')
    const redirectUri = `${process.env.Redirect_URI}/api/outlook/callback`;
    const { code } = req.query;

    const tokenRequest = {
      code: code as string,
      scopes,
      redirectUri,
      clientSecret: process.env.Outlook_Client_Secret,
    };

    const msalConfig = {
      auth: {
        clientId: process.env.Outlook_Client_ID as string,
        authority: `https://login.microsoftonline.com/${
          process.env.Outlook_TENENT_ID as string
        }`,
        redirectUri,
        clientSecret: process.env.Outlook_Client_Secret,
      },
    };

    const pca = new PublicClientApplication(msalConfig);

    const data = await pca.acquireTokenByCode(tokenRequest);
    const accessToken = data?.accessToken;
    const userEmail = data?.account?.username;

    const account = await db.account.create({
      data: {
        access_token: accessToken,
        email: userEmail as string,
        name: data?.account?.username ? data?.account?.username : userEmail,
        type:'Outlook'
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
      .redirect(
        `${process.env.BASE_URL}/email-accounts?data=success_signed`
      );
  } catch (error: any) {
    console.log(
      "Error while generating access token for outlook:",
      error.message
    );
    return res
      .status(300)
      .redirect(
        `${process.env.BASE_URL}/email-accounts?error=InternalError`
      );
  }
};
