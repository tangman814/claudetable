import { Router } from "express";
import { getAvailability, getSchedule } from "../services/availabilityService";
import { computeEndTime } from "../services/reservationService";

const router = Router();

// GET /availability?date=YYYY-MM-DD&time=HH:MM&duration=150
router.get("/", (req, res) => {
  const { date, time, duration } = req.query;
  if (!date || !time) {
    res.status(400).json({ error: "BadRequest", message: "date and time are required" });
    return;
  }

  const dur = duration ? Number(duration) : 150;
  const endTime = computeEndTime(time as string, dur);
  const excludeId = req.query.excludeReservationId ? Number(req.query.excludeReservationId) : undefined;
  const data = getAvailability(date as string, time as string, endTime, excludeId);
  res.json({ data });
});

// GET /schedule?date=YYYY-MM-DD
router.get("/schedule", (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400).json({ error: "BadRequest", message: "date is required" });
    return;
  }
  const data = getSchedule(date as string);
  res.json({ data });
});

export default router;
