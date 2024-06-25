import express from "express";
import { generateMailReply, getAccounts,getAllExtractMails,getMailReply,sendEmailToUser,updateAutoSend } from "../controllers/emailController";
const router = express.Router();

router.get("/get-accounts", getAccounts);
router.get("/get-extract-mails", getAllExtractMails);
router.get("/get-mail-reply", getMailReply);
router.post("/update-autoreply-status", updateAutoSend);
router.get("/generate-mail-reply/:id", generateMailReply);
router.post("/send-email", sendEmailToUser);

module.exports = router;
