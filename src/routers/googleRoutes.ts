import express from "express";
import { googleAuth, googleCallback } from "../controllers/googleController";
const router = express.Router();

router.get("/auth", googleAuth);
router.get("/callback", googleCallback);

module.exports = router;
