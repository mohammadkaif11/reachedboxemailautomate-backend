import { Request, Response } from "express";
import { google } from "googleapis";
import { db } from "../utils/db";
import { addFetchEmailsJobInterval } from "../worker/queue";

export const googleAuth = (req: Request, res: Response) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.Redirect_URI}/api/google/callback`
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });
    return res.redirect(url);
  } catch (error: any) {
    console.log("Error while google auth:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.Redirect_URI}/api/google/callback`
    );
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens?.access_token || !tokens?.refresh_token) {
      return res
        .status(300)
        .redirect(`${process.env.BASE_URL}/email-accounts?data=already_signed`);
    }

      // Extract email from the ID token payload
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token as string,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.email;

    if (!email) {
      throw new Error("Email not found in token payload ");
    }

    const account = await db.account.create({
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        email: email,
        name: name ,
        type: "Gmail",
      },
    });

    if (!account) {
      throw new Error("Account not");
    }

    await addFetchEmailsJobInterval(account.id);

    return res
      .status(300)
      .redirect(`${process.env.BASE_URL}/email-accounts?data=success_signed`);
  } catch (error: any) {
    console.log("Error while google auth:", error.message);
    return res
      .status(300)
      .redirect(`${process.env.BASE_URL}/email-accounts?error=InternalError`);
  }
};
