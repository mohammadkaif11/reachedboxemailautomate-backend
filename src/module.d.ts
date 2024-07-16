import { Account } from "@prisma/client";

export type Mail = {
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  email: string;
  label: string;
};

export interface FetchEmailsJobInputData {
  accoundId: number;
}

export interface SendReplyJobInputData {
  mails: Mail[];
  user: Account;
}

export type MaiLReplyJobInputData = {
  mail:Mail;
  account: Account;
};


export interface sendEmail {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  email: string;
  label: string;
  account: Account;
}

export interface SendMailAPIRequestBody {
  AIResponse: {
    data: {
      content: string;
      subject: string;
    };
    mail: sendEmail;
  };
}

export interface OutLookMail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  sender: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  webLink: string;
  internetMessageId: string;
}

export interface OutLookMailWithCategory {
  id: string;
  subject: string;
  bodyPreview: string;
  sender: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  label: string;
}
