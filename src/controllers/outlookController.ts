import { Request, Response } from "express";
import { ConfidentialClientApplication, Configuration, SilentFlowRequest } from "@azure/msal-node";
import { db } from "../utils/db";
import { addFetchEmailsJobInterval } from "../worker/queue";

export const outlookAuth = async (req: Request, res: Response) => {
  try {
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI as string;
    const clientId = process.env.OUTLOOK_CLIENT_ID as string;
    const tenantId = process.env.OUTLOOK_TENANT_ID as string;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET as string;

    const authority = `https://login.microsoftonline.com/${tenantId}`;

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
      scopes: [
        "User.Read",
        "Mail.Read",
        "offline_access",
        "Mail.ReadWrite",
        "Mail.ReadWrite.Shared",
        "Mail.Send"
      ],
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
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET as string;
    const tenantId = process.env.OUTLOOK_TENANT_ID as string;
    const authority = `https://login.microsoftonline.com/${tenantId}`;
    const { code } = req.query;

    const tokenRequest = {
      code: code as string,
      scopes: [
        "User.Read",
        "Mail.Read",
        "offline_access",
        "Mail.ReadWrite",
        "Mail.ReadWrite.Shared",
      ],
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
    console.log('data', data);

    if(!data.account){
      throw new Error("Account cannot be null");
    }
    
    // const existEmil=await db.account.findFirst({where:{email:data?.account?.username}})
    // if(existEmaila){
    //   throw new Error("Account already exists");
    // }

    const silentRequest: SilentFlowRequest = {
      account: data.account, 
      scopes: [
        "User.Read",
        "Mail.Read",
        "offline_access",
        "Mail.ReadWrite",
        "Mail.ReadWrite.Shared",
        "Mail.Send"
      ],
      forceRefresh: false
    };

    const silentResponse = await cca.acquireTokenSilent(silentRequest);
    const accessToken = silentResponse?.accessToken;
    const userEmail = silentResponse?.account?.username;
    const refreshToken=silentResponse?.idToken;
    const userName=data?.account?.name;
    
    const account = await db.account.create({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        email: userEmail as string,
        name: userName as string,
        type: "Outlook",
      },
    });

    await addFetchEmailsJobInterval(account.id);

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
