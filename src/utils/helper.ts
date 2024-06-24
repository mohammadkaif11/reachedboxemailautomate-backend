export function extractEmailAddress(input: string): string | null {
  const regex = /<([^>]+)>/;

  const match = input.match(regex);

  return match ? match[1] : null;
}

export async function createMessage(
  sender: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const emailLines = [];
  emailLines.push(`From: ${sender}`);
  emailLines.push(`To: ${to}`);
  emailLines.push("Content-Type: text/html; charset=utf-8");
  emailLines.push(`MIME-Version: 1.0`);
  emailLines.push(`Subject: ${subject}`);
  emailLines.push("");
  emailLines.push(body);

  const email = emailLines.join("\r\n").trim();

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return encodedEmail;
}
