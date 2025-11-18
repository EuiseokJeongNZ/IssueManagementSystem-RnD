import express from "express";
import { verifyAccess } from "../middlewares/auth.js";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/calendar.controller.js";

const router = express.Router();

router.get("/", verifyAccess, getEvents);
router.post("/", verifyAccess, createEvent);
router.patch("/:id", verifyAccess, updateEvent); // ✅ 수정 추가
router.delete("/:id", verifyAccess, deleteEvent);

export default router;
