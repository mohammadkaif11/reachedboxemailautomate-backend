import Redis from "ioredis";
import {
  extractGoogleMail,
  FilterIntrestedMail,
  generateEmailsAndSaveIntoQueue,
} from "../utils/google";
import {
  CreateJOBQueueFetchEmailsInput,
  MailType,
  CreateJOBQueueSendReplyInputType,
  AddMAILINQUEUE,
  QueueInputDataInterface,
} from "../module";
const REDIS_URL =
  "rediss://red-cps056l6l47c73dtg8tg:4pyDNHpRV4WcxdUIg1N58rTTy35Yk5A8@oregon-redis.render.com:6379";
import { Queue, Worker } from "bullmq";
import { db } from "../utils/db";
import { extractOutlookMail, getIntrestedMail } from "../utils/outlook";

export const Redisconnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const taskQueue = new Queue("taskQueue", {
  connection: Redisconnection,
});

export const mailQueue = new Queue("mailQueue", {
  connection: Redisconnection,
});

export async function addFetchEmailsJobInterval(accoundId: number) {
  const queueData: QueueInputDataInterface = {
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

export async function addSendReplyJob(
  queueData: MailType[],
  userData: CreateJOBQueueFetchEmailsInput
) {
  await taskQueue.add("sendReply", {
    mails: queueData,
    user: userData,
  });
}

export async function addEmailsInMailQueue(queueData: AddMAILINQUEUE) {
  mailQueue.add("addMail", queueData);
}

const taskWorker = new Worker(
  "taskQueue",
  async (job) => {
    try {
      switch (job.name) {
        case "fetchEmails":
          const queueData: QueueInputDataInterface = job.data;
          const account=await db.account.findUnique({where:{id:queueData.accoundId}});
          if (account?.type == "Gmail") {
            console.log('Task worker in gmail process')
            const mail = await extractGoogleMail(account?.refresh_token,account?.id);
            const intrestedMail= FilterIntrestedMail(mail);

            //If Queue data auto send true then add into queue
            if (intrestedMail.length > 0 && account.autoSend) {

            }
          } else if (account?.type == "Outlook") {
            console.log('Task worker in outlook process')
            const mail=await extractOutlookMail(account.id,account?.access_token);
            const intrestedMail=await getIntrestedMail(mail)
            //Push all IntrestedMail into queue
            if(intrestedMail.length > 0 && account.autoSend) {

            }
          }
          // for any provider
          break;
        case "sendReply":
          const queueInput: CreateJOBQueueSendReplyInputType = job.data;
          generateEmailsAndSaveIntoQueue(queueInput);
          break;
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

const mailWorker = new Worker(
  "mailQueue",
  async (job) => {
    try {
      switch (job.name) {
        case "addMail":
          //Send mail reply automate
          break;
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

mailWorker.on("failed", (job, err) => {
  console.error(`mailWorker Job ${job?.name} failed with error ${err.message}`);
});

mailWorker.on("completed", (job) => {
  console.log(`mailWorker Job ${job.name} completed successfully`);
});
