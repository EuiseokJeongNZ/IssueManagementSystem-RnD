import { useState, useEffect, useRef } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import { formatDate } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import Header from "../components/Header";
import { tokens } from "../theme";

const Timetable = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [currentEvents, setCurrentEvents] = useState([]);
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ✅ 캘린더 ref (사이드바 삭제 시, 캘린더에서도 즉시 제거용)
  const calendarRef = useRef(null);

  // ✅ 일정 불러오기
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API}/calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCurrentEvents(
        res.data.map((e) => ({
          id: e._id,
          title: e.title,
          start: e.date,
          allDay: true,
        }))
      );
    } catch (err) {
      console.error("일정 불러오기 실패:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // ✅ 공통 삭제 함수 (캘린더/사이드바에서 공유)
  const deleteEventById = async (id, title) => {
    const ok = window.confirm(`Delete '${title}'?`);
    if (!ok) return;

    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API}/calendar/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 캘린더에서 제거
      const api = calendarRef.current?.getApi();
      api?.getEventById(id)?.remove();

      // 사이드바 목록에서 제거
      setCurrentEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("일정 삭제 실패:", err);
    }
  };

  // ✅ 일정 추가
  const handleDateClick = async (selected) => {
    const title = prompt("Enter a new event title:");
    if (!title) return;

    const calendarApi = selected.view.calendar;
    calendarApi.unselect();

    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.post(
        `${API}/calendar`,
        { title, date: selected.startStr },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newEvent = res.data;

      // 즉시 반영
      setCurrentEvents((prev) => [
        ...prev,
        { id: newEvent._id, title: newEvent.title, start: newEvent.date, allDay: true },
      ]);
      calendarApi.addEvent({
        id: newEvent._id,
        title: newEvent.title,
        start: newEvent.date,
        allDay: true,
      });
    } catch (err) {
      console.error("일정 추가 실패:", err);
    }
  };

  // ✅ 캘린더 이벤트 클릭 (기존 로직 유지)
  const handleEventClick = async (selected) => {
    const action = window.prompt(
      `Event: "${selected.event.title}"\n\nChoose an action:\n1. edit\n2. delete\n(enter number or cancel)`
    );

    if (!action) return;

    // ✏️ 수정
    if (action === "1" || action.toLowerCase() === "edit") {
      const newTitle = prompt("Enter new title:", selected.event.title);
      if (!newTitle || newTitle === selected.event.title) return;

      try {
        const token = localStorage.getItem("accessToken");
        await axios.patch(
          `${API}/calendar/${selected.event.id}`,
          { title: newTitle },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // 즉시 UI 업데이트
        selected.event.setProp("title", newTitle);
        setCurrentEvents((prev) =>
          prev.map((e) =>
            e.id === selected.event.id ? { ...e, title: newTitle } : e
          )
        );
      } catch (err) {
        console.error("일정 수정 실패:", err);
      }

      return;
    }

    // 🗑️ 삭제
    if (action === "2" || action.toLowerCase() === "delete") {
      await deleteEventById(selected.event.id, selected.event.title);
    }
  };

  return (
    <Box m="20px">
      <Header
        title={
          <span style={{ color: colors.primary[100], fontWeight: "bold" }}>
            TIMETABLE
          </span>
        }
        subtitle={
          <span style={{ color: colors.primary[100] }}>
            Click on a date to add multiple events.  
            Click an event to edit or delete.
          </span>
        }
      />

      <Box display="flex" flexDirection={{ xs: "column", md: "row" }}>
        {/* Sidebar */}
        <Box
          flex={{ xs: "1 1 100%", md: "1 1 20%" }}
          backgroundColor={colors.primary[400]}
          p="15px"
          borderRadius="4px"
          mb={{ xs: "15px", md: "0" }}
        >
          <Typography
            variant="h5"
            sx={{ color: colors.orangeAccent[300], mb: 1 }}
          >
            Events
          </Typography>
          <List sx={{ py: 0 }}>
            {currentEvents.map((event) => (
              <ListItem
                key={event.id}
                onClick={() => deleteEventById(event.id, event.title)} // ✅ 클릭=삭제
                sx={{
                  backgroundColor: colors.orangeAccent[700],
                  margin: "10px 0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  "&:hover": { opacity: 0.9 },
                }}
              >
                <ListItemText
                  primaryTypographyProps={{
                    sx: { color: "#fff", fontWeight: 600 },
                  }}
                  secondaryTypographyProps={{ sx: { color: "#fff" } }}
                  primary={event.title}
                  secondary={formatDate(event.start, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Calendar */}
        <Box
          flex={{ xs: "1 1 100%", md: "1 1 80%" }}
          ml={{ xs: "0", md: "15px" }}
        >
          <FullCalendar
            ref={calendarRef}                   // ✅ ref 연결
            height="75vh"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateClick}
            eventClick={handleEventClick}
            events={currentEvents}
            // 🎨 기본 파란색을 오렌지로 통일
            eventColor={colors.orangeAccent[600]}   // 배경/테두리
            eventTextColor="#fff"
            // 드래그/리사이즈 핸들과 오늘 색 등은 기본 유지 (필요 시 추가 지정 가능)
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Timetable;
