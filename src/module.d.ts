export type CreateJOBQueueFetchEmailsInput = {
  id: number;
  accessToken: string;
  refreshToken: string;
  type: string;
  mail: string;
  autoSend: boolean;
};

export type MailType = {
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  email: string;
  label: string;
};

export type CreateJOBQueueSendReplyInputType = {
  mails: MailType[];
  user: CreateJOBQueueFetchEmailsInput;
};

export type AddMAILINQUEUE = {
  fromEmail: string;
  subject: string;
  content: string;
  user: CreateJOBQueueFetchEmailsInput;
};

export interface Account {
  id: number;
  email: string;
  name: string;
  access_token: string;
  refresh_token: string;
  type: string;
  autoSend: boolean;
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


export interface QueueInputDataInterface {
 accoundId:number
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


