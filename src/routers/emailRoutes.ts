import express from "express";
import { generateMailReply, getAccounts,getAllExtractMails,sendEmailToUser,updateAutoSend } from "../controllers/emailController";
const router = express.Router();

router.get("/get-accounts", getAccounts);
router.get("/get-extract-mails", getAllExtractMails);
router.post("/update-autoreply-status", updateAutoSend);
router.get("/generate-mail-reply/:id", generateMailReply);
router.post("/send-email", sendEmailToUser);

module.exports = router;
