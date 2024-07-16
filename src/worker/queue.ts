import Redis from "ioredis";
import { extractGoogleMail, FilterIntrestedMail } from "../utils/google";
import {
  MaiLReplyJobInputData,
  FetchEmailsJobInputData,
  Mail,
} from "../module";
const REDIS_URL =
  "rediss://red-cps056l6l47c73dtg8tg:4pyDNHpRV4WcxdUIg1N58rTTy35Yk5A8@oregon-redis.render.com:6379";
import { Queue, Worker } from "bullmq";
import { db } from "../utils/db";
import { extractOutlookMail, getIntrestedMail } from "../utils/outlook";
import { Account } from "@prisma/client";

export const Redisconnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const taskQueue = new Queue("taskQueue", {
  connection: Redisconnection,
});

export async function addFetchEmailsJobInterval(accoundId: number) {
  const queueData: FetchEmailsJobInputData = {
    accoundId: accoundId,
  };
  await taskQueue.add("fetchEmails", queueData, {
    repeat: {
      every: 600000,
      jobId: String(accoundId),
    },
  });
}

export async function deleteFetchEmailsJob(jobId: string) {
  try {
    const repeatableJobs = await taskQueue.getRepeatableJobs();
    const jobToDelete = repeatableJobs.find((job) => job.id === jobId);

    if (jobToDelete) {
      await taskQueue.removeRepeatableByKey(jobToDelete.key);
      console.log(`Successfully removed job with ID: ${jobId}`);
    } else {
      console.error(`Job with ID: ${jobId} not found`);
    }
  } catch (error) {
    console.error(`Error removing job with ID: ${jobId}`, error);
  }
}

export async function addMailIntoQueue(queueData: MaiLReplyJobInputData) {
  await taskQueue.add("addMail", queueData);
}

const taskWorker = new Worker(
  "taskQueue",
  async (job) => {
    try {
      switch (job.name) {
        case "fetchEmails": {
          const queueData: FetchEmailsJobInputData = job.data;
          const account = await db.account.findUnique({
            where: { id: queueData.accoundId },
          });
          if (account?.type == "Gmail") {
            const mail = await extractGoogleMail(
              account?.refresh_token,
              account?.id
            );
            const intrestedMail = FilterIntrestedMail(mail);

            //If Queue data auto send true then add into queue
            if (intrestedMail.length > 0 && account.autoSend) {
              for (const mail of intrestedMail) {
                const obj: MaiLReplyJobInputData = {
                  mail: mail,
                  account: account,
                };
                await addMailIntoQueue(obj);
              }
            }
          } else if (account?.type == "Outlook") {
            const mail = await extractOutlookMail(
              account.id,
              account?.access_token
            );
            const intrestedMail = await getIntrestedMail(mail);
            //Push all IntrestedMail into queue
            if (intrestedMail.length > 0 && account.autoSend) {
              for (const mail of intrestedMail) {
                const obj: MaiLReplyJobInputData = {
                  mail: mail,
                  account: account,
                };
                await addMailIntoQueue(obj);
              }
            }
          }
          break;
        }

        case "addMail": {
          const inputData: MaiLReplyJobInputData = job.data;
          console.log("[Add Mail Job]: " + inputData);
        }

        default:
          console.error(`Unhandled job type: ${job.name}`);
          break;
      }
    } catch (error) {
      console.error(`Job ${job.id} failed with error:`, error);
    }
  },
  { connection: Redisconnection }
);

taskWorker.on("failed", (job, err) => {
  console.error(`taskWorker Job ${job?.name} failed with error ${err.message}`);
});

taskWorker.on("completed", (job) => {
  console.log(`taskWorker Job ${job.name} completed successfully`);
});
