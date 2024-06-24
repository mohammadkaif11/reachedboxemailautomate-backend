import OpenAI from "openai";

const findCategoryEmailPrompt = (args: {
  emailContent: string;
  emailSubject: string;
}) => [
  {
    role: "system",
    content: `Your task is categorize the email based on content and subject of email,The Categories should be only one (Interested, Not_Interested, More_Information) Note- bank related and advertisment related mail should categories Not_Interested`,
  },
  {
    role: "user",
    content: `email content ${args.emailContent} and email subject ${args.emailSubject}`,
  },
];

export async function getCategoryOfMail(
  emailContent: string,
  emailSubject: string
) {
  const openai = new OpenAI();

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: findCategoryEmailPrompt({ emailContent, emailSubject }) as any,
  });

  const category = aiResponse.choices[0]?.message.content;

  return category;
}

const writeEmailPrompt = (args: {
  emailContent: string;
  emailSubject: string;
  emailFrom: string;
}) => [
  {
    role: "system",
    content: `Your task is write the email reply based on content and subject of email, Note-: send back only json object {"content":"","subject":""}`,
  },
  {
    role: "user",
    content: `email content ${args.emailContent} and email subject ${args.emailSubject} and Email is sending from ${args.emailFrom} `,
  },
];

export async function writeEmail(emailContent: string, emailSubject: string,emailFrom:string) {
  const openai = new OpenAI();

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: writeEmailPrompt({ emailContent, emailSubject,emailFrom }) as any,
  });

  const mail = aiResponse.choices[0]?.message.content;

  return mail;
}
