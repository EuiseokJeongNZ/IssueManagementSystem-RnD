// src/scenes/SubmitIssue.jsx — handleFormSubmit 안에서 서버 전송
import axios from "axios";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const handleFormSubmit = async (values, helpers) => {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "{}");
    const token = localStorage.getItem("accessToken");

    // 서버에서 요구하는 값으로 매핑 (소문자 변환)
    const scope = values.scope.toLowerCase();         // "individual" | "team"
    const severity = values.severity.toLowerCase();   // "low" | "medium" | "high"
    const semester = values.semester === "S2" ? 2 : 1;

    const form = new FormData();
    form.append("title", values.title);
    form.append("description", values.description);
    form.append("scope", scope);
    form.append("severity", severity);
    form.append("semester", String(semester));
    form.append("user_id", String(user.user_id)); // 서버에서 submitted_by로 사용

    // 팀 이슈면 team_id도 같이 줄 수 있음(없으면 서버가 students에서 찾음)
    if (scope === "team" && user.team_id) {
      form.append("team_id", String(user.team_id));
    }

    // 여러 파일
    (values.attachments || []).forEach((f) => {
      form.append("attachments", f); // 서버에서 .array("attachments")
    });

    const res = await axios.post(`${API}/issues`, form, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });

    console.log("Created:", res.data);
    helpers.resetForm({ values: { ...values, title: "", description: "", attachments: [] } });
    localStorage.removeItem("issueFormDraft_v2");
    setOpenSnack(true);
  } catch (e) {
    console.error(e?.response?.data || e.message);
    alert("Submit failed");
  }
};
