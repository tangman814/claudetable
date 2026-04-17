"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availabilityService_1 = require("../services/availabilityService");
const reservationService_1 = require("../services/reservationService");
const router = (0, express_1.Router)();
// GET /availability?date=YYYY-MM-DD&time=HH:MM&duration=150
router.get("/", (req, res) => {
    const { date, time, duration } = req.query;
    if (!date || !time) {
        res.status(400).json({ error: "BadRequest", message: "date and time are required" });
        return;
    }
    const dur = duration ? Number(duration) : 150;
    const endTime = (0, reservationService_1.computeEndTime)(time, dur);
    const excludeId = req.query.excludeReservationId ? Number(req.query.excludeReservationId) : undefined;
    const data = (0, availabilityService_1.getAvailability)(date, time, endTime, excludeId);
    res.json({ data });
});
// GET /schedule?date=YYYY-MM-DD
router.get("/schedule", (req, res) => {
    const { date } = req.query;
    if (!date) {
        res.status(400).json({ error: "BadRequest", message: "date is required" });
        return;
    }
    const data = (0, availabilityService_1.getSchedule)(date);
    res.json({ data });
});
exports.default = router;
