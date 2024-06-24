const dotenv = require("dotenv");
dotenv.config();
import express from "express";
import { createBullBoard } from "bull-board";
import { BullMQAdapter } from "bull-board/bullMQAdapter";
const googleRoutes = require("./routers/googleRoutes");
const outlookRoutes = require("./routers/outlookRoutes");
const emailRoutes = require("./routers/emailRoutes");
import cors from "cors";
import { taskQueue } from "./worker/queue";
const app = express();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;


//UI for Dashboard for redis
const { router } = createBullBoard([new BullMQAdapter(taskQueue)]);
app.use("/admin/queues", router);

app.use("/api/google", googleRoutes);
app.use("/api/outlook", outlookRoutes);
app.use("/api", emailRoutes);

app.listen(PORT, () => {
  console.log("Server running at PORT: ", PORT);
});

