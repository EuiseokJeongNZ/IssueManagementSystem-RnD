import CalendarEvent from "../models/calendarEvent.model.js";

// Bring in the necessary models
export const getEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find({ user_id: req.user.id }).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

// Add new event
export const createEvent = async (req, res) => {
  try {
    const { title, date } = req.body;
    if (!title || !date)
      return res.status(400).json({ error: "Title and date are required" });

    const event = new CalendarEvent({ user_id: req.user.id, title, date });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
};

// Modify event
export const updateEvent = async (req, res) => {
  try {
    const { title } = req.body;
    const { id } = req.params;

    const updated = await CalendarEvent.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { title },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Event not found" });

    res.json(updated);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const deleted = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
};
