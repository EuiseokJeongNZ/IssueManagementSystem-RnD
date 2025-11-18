import React, { useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import Header from "../../components/Header";
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  Chip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Avatar,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import LineChart from "../../components/LineChart";
import PieChart from "../../components/PieChart";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const sevChip = (sev, colors) => {
  switch (sev) {
    case "high":
      return { sx: { bgcolor: colors.redAccent[600], color: "#fff" }, label: "HIGH" };
    case "medium":
      return { sx: { bgcolor: colors.orangeAccent[600], color: "#fff" }, label: "MEDIUM" };
    default:
      return { sx: { bgcolor: colors.greenAccent[600], color: "#fff" }, label: "LOW" };
  }
};

const statusChip = (st, colors) => {
  switch (st) {
    case "resolved":
      return { sx: { bgcolor: colors.greenAccent[700], color: "#fff" }, label: "RESOLVED" };
    case "in_progress":
      return { sx: { bgcolor: colors.orangeAccent[700], color: "#fff" }, label: "IN PROGRESS" };
    default:
      return { sx: { bgcolor: colors.redAccent[600], color: "#fff" }, label: "OPEN" };
  }
};

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [q, setQ] = useState("");
  const [sev, setSev] = useState("all");
  const [stat, setStat] = useState("all");
  const [scope, setScope] = useState("all");

  const [myTeamId, setMyTeamId] = useState(null);
  const [visibleUsers, setVisibleUsers] = useState([]);

  const [myRoleId, setMyRoleId] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [myMentorTeamIds, setMyMentorTeamIds] = useState(new Set());

  // mentor_team_assign 원본 저장 (학생 카드에서 멘토 집계에 사용)
  const [mentorAssignments, setMentorAssignments] = useState([]);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const teamNameById = useMemo(() => {
    const map = new Map();
    visibleUsers.forEach((u) => {
      if (u.team_id != null && u.team_name) map.set(u.team_id, u.team_name);
    });
    return map;
  }, [visibleUsers]);

  const userNameById = useMemo(() => {
    const m = new Map();
    visibleUsers.forEach((u) => {
      if (u?.user_id != null && u?.name) {
        m.set(String(u.user_id), u.name);
      }
    });
    return m;
  }, [visibleUsers]);

  // 가운데 정렬 공통
  const center = { headerAlign: "center", align: "center" };

  // 영어 간단 날짜 포맷터 + AM/PM 대문자
  const fmtEn = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const formatEnDate = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d)) return "-";
    return fmtEn.format(d).replace(",", "").replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  };

  // 사용자/팀/멘토 할당 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [meRes, usersRes, mentorAssignRes] = await Promise.all([
          axios.get(`${API}/users/me`, { headers }),
          axios.get(`${API}/users`, { headers }),
          axios.get(`${API}/mentor_team_assign`, { headers }),
        ]);
        if (!alive) return;

        const me = meRes.data;
        const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.items || [];

        // 멘토에게 mentor_team_assign의 첫 팀을 대표 team_id로 매핑(표시용)
        const mentorTeams = mentorAssignRes.data || [];
        const fixedUsers = users.map((u) => {
          if (u.role_id === 2) {
            const assigned = mentorTeams.filter((m) => m.mentor_user_id === u.user_id);
            if (assigned.length) return { ...u, team_id: assigned[0].team_id };
          }
          return u;
        });

        setVisibleUsers(fixedUsers);
        setMentorAssignments(mentorTeams);

        setMyTeamId(me?.team_id ?? null);
        setMyRoleId(me?.role_id ?? null);
        setMyUserId(me?.user_id ?? me?._id ?? null);

        if (me?.role_id === 2 && Array.isArray(mentorAssignRes.data)) {
          const myTeams = mentorAssignRes.data
            .filter((m) => m.mentor_user_id === me.user_id)
            .map((m) => m.team_id);
          setMyMentorTeamIds(new Set(myTeams));
        } else {
          setMyMentorTeamIds(new Set());
        }
      } catch (e) {
        console.error("유저/멘토 정보 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // mentor_team_assign → team_id별 멘토ID 집합
  const mentorIdsByTeam = useMemo(() => {
    const map = new Map();
    (mentorAssignments || []).forEach((m) => {
      if (!map.has(m.team_id)) map.set(m.team_id, new Set());
      map.get(m.team_id).add(m.mentor_user_id);
    });
    return map;
  }, [mentorAssignments]);

  // 이슈 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${API}/issues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        if (!alive) return;
        setIssues(Array.isArray(res.data) ? res.data : res.data.items || []);
      } catch (e) {
        console.warn("GET /issues 실패:", e?.response?.data || e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 지표
  const totalIssues = issues.length;
  const solvedIssues = issues.filter((i) => i.status === "resolved").length;
  const nonSolvedIssues = totalIssues - solvedIssues;

  // 팀/인원 집계 로직
  const totalTeamMembers = useMemo(() => {
    if (!visibleUsers.length || !myRoleId) return 0;

    const roleIdOf = (u) => Number(u.role_id);
    const isAdmin = (u) => roleIdOf(u) === 1;
    const isStudent = (u) => roleIdOf(u) === 3;

    if (myRoleId === 3) {
      // Student: 내 팀 학생 수 + 우리 팀 멘토 수 (Admin 제외)
      const studentsInMyTeam = visibleUsers.filter(
        (u) => (u.team_id ?? null) === myTeamId && isStudent(u)
      ).length;

      // mentor_team_assign 기준 우리 팀 멘토 수
      const mentorIds = mentorIdsByTeam.get(myTeamId) || new Set();
      const mentorsInMyTeam = [...mentorIds].filter((mid) =>
        visibleUsers.some((u) => (u.user_id ?? u._id) === mid)
      ).length;

      return studentsInMyTeam + mentorsInMyTeam;
    }

    if (myRoleId === 2) {
      // Mentor: 맡은 팀 개수
      return myMentorTeamIds.size;
    }

    if (myRoleId === 1) {
      // Admin: 전체 팀 개수(관리자 제외, null 제외)
      const teamIds = new Set(
        visibleUsers
          .filter((u) => !isAdmin(u))
          .map((u) => u.team_id)
          .filter((tid) => tid !== null && tid !== undefined)
      );
      return teamIds.size;
    }

    return 0;
  }, [visibleUsers, myRoleId, myTeamId, myMentorTeamIds, mentorIdsByTeam]);

  // 테이블 rows
  const rows = useMemo(
    () =>
      issues.map((i, idx) => ({
        id: idx + 1,
        issue_id: i.issue_id ?? i._id ?? idx + 1,
        title: i.title,
        severity: i.severity,
        status: i.status,
        scope: i.issue_scope,
        impact: i.impact,
        team_id: i.team_id ?? null,
        team_name: i.team_name ?? teamNameById.get(i.team_id) ?? "-",
        submitted_by: i.submitted_by,
        submitted_by_name: userNameById.get(String(i.submitted_by)) || i?.author?.name || "-",
        semester: i.semester ?? "-",
        created_at: i.created_at,
      })),
    [issues, teamNameById, userNameById]
  );

  const filtered = useMemo(() => {
    const qlow = q.toLowerCase();
    return rows.filter((r) => {
      const okQ =
        !q ||
        (r.title ?? "").toLowerCase().includes(qlow) ||
        String(r.issue_id).includes(q) ||
        (r.team_name ?? "-").toLowerCase().includes(qlow) ||
        String(r.team_id ?? "").includes(q) ||
        (r.submitted_by_name ?? "-").toLowerCase().includes(qlow);
      const okSev = sev === "all" || r.severity === sev;
      const okStat = stat === "all" || r.status === stat;
      const okScope = scope === "all" || r.scope === scope;
      return okQ && okSev && okStat && okScope;
    });
  }, [rows, q, sev, stat, scope]);

  // 상세 열기
  const handleOpenDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedIssue(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API}/issues/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      setSelectedIssue(res.data);
    } catch (e) {
      console.error("Failed to fetch issue detail:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // 컬럼
  const columns = [
    // { field: "issue_id", headerName: "Issue ID", flex: 0.5, ...center },
    {
      field: "title",
      headerName: "Title",
      width: 160,
      sortable: true,
      ...center,
      renderCell: (params) => (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <Typography
            onClick={() => handleOpenDetail(params.row.issue_id)}
            sx={{
              cursor: "pointer",
              color: colors.orangeAccent[500],
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              "&:hover": { textDecoration: "underline" },
              textAlign: "center",
            }}
            title={params.value}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "severity",
      headerName: "Severity",
      flex: 1,
      ...center,
      renderCell: ({ value }) => {
        const { sx, label } = sevChip(value, colors);
        return (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Chip size="small" label={label} sx={{ ...sx, fontWeight: 700 }} />
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      ...center,
      renderCell: ({ value }) => {
        const { sx, label } = statusChip(value, colors);
        return (
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Chip size="small" label={label} sx={{ ...sx, fontWeight: 700 }} />
          </Box>
        );
      },
    },
    { field: "scope", headerName: "Scope", flex: 1, ...center },
    { field: "impact", headerName: "Impact", flex: 1, ...center },
    { field: "team_name", headerName: "Team Name", flex: 1, ...center },
    { field: "submitted_by_name", headerName: "Submitted By", flex: 1, ...center },
    {
      field: "semester",
      headerName: "SEMESTER",
      type: "number",
      ...center,
      valueGetter: (params) => Number(params.row.semester),
      valueFormatter: ({ value }) => (value == null ? "" : `SEM ${value}`),
    },
    {
      field: "created_at",
      headerName: "Created At",
      flex: 1.3,
      ...center,
      valueGetter: (params) => new Date(params.value),
      valueFormatter: (params) => {
        const d = params.value;
        if (!(d instanceof Date) || isNaN(d)) return "-";
        return formatEnDate(d);
      },
    },
  ];

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header
          title="DASHBOARD"
          subtitle={<span style={{ color: colors.orangeAccent[500] }}>Welcome to your dashboard</span>}
        />
      </Box>

      {/* 상단 카드 */}
      <div className="row">
        {[
          {
            img: "class2.png",
            label: myRoleId === 1 || myRoleId === 2 ? "Total Teams" : "Total Team Members",
            value:
              myRoleId === 2
                ? myMentorTeamIds.size
                : myRoleId === 1
                ? new Set(
                    visibleUsers
                      .filter((u) => Number(u.role_id) !== 1)
                      .map((u) => u.team_id)
                      .filter((tid) => tid !== null && tid !== undefined)
                  ).size
                : totalTeamMembers,
          },
          { img: "total_issue.png", label: "Total Issues", value: totalIssues },
          { img: "non-solved-issue.png", label: "Non Solved Issues", value: nonSolvedIssues },
          { img: "solved-issue.png", label: "Solved Issues", value: solvedIssues },
        ].map((c, i) => (
          <div key={i} className="row-card" style={{ backgroundColor: `${colors.primary[400]}` }}>
            <div className="img-box" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img
                src={`../../assets/${c.img}`}
                alt={c.label}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}
              />
            </div>
            <Typography variant="h4" color={colors.orangeAccent[500]} fontWeight="800">
              {loading && c.label !== "Total Team Members" ? "…" : c.value}
            </Typography>
            <Typography variant="h6" color={colors.gray[100]}>
              {c.label}
            </Typography>
          </div>
        ))}
      </div>

      {/* 그래프 */}
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))"
        gridAutoRows="140px"
        gap="20px"
        marginTop="1rem"
      >
        <Box gridRow="span 2" backgroundColor={colors.primary[400]}>
          <Box mt="25px" p="0 30px" display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight="600" color={colors.gray[100]}>
                Issues Line
              </Typography>
              <Typography variant="h3" fontWeight="bold" color={colors.orangeAccent[500]}>
                {loading ? "…" : totalIssues} Issues
              </Typography>
            </Box>
            <Box>
              <IconButton>
                <DownloadOutlinedIcon sx={{ fontSize: 26, color: colors.orangeAccent[500] }} />
              </IconButton>
            </Box>
          </Box>
          <Box height="250px" m="-20px 0 0 0">
            {loading ? (
              <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <LineChart isDashboard />
            )}
          </Box>
        </Box>

        <Box gridRow="span 2" backgroundColor={colors.primary[400]} overflow="auto">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            borderBottom={`4px solid ${colors.primary[500]}`}
            colors={colors.gray[100]}
            p="15px"
          >
            <Typography color={colors.gray[100]} variant="h5" fontWeight="600">
              Issues Pie
            </Typography>
          </Box>
          <Box height="250px" m="-20px 0 0 0">
            {loading ? (
              <Box height="100%" display="flex" alignItems="center" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <PieChart isDashboard />
            )}
          </Box>
        </Box>
      </Box>

      {/* 하단 테이블 */}
      <Box mt={4}>
        <Header
          title="All Issues"
          subtitle={<span style={{ color: colors.orangeAccent[500] }}>View, search and filter issues</span>}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch" sx={{ mb: 2 }}>
          <TextField
            label="Search (title / id / team)"
            variant="outlined"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Severity</InputLabel>
            <Select label="Severity" value={sev} onChange={(e) => setSev(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 170 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={stat} onChange={(e) => setStat(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 170 }}>
            <InputLabel>Scope</InputLabel>
            <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="individual">Individual</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Box
          sx={{
            height: "70vh",
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: colors.orangeAccent[400],
              color: "#fff",
              fontWeight: 800,
            },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
            "& .MuiDataGrid-footerContainer": { backgroundColor: colors.orangeAccent[400] },
          }}
        >
          {loading ? (
            <Box height="100%" display="flex" alignItems="center" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              checkboxSelection
              rows={filtered}
              columns={columns}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
                sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          )}
        </Box>
      </Box>

      {/* 상세 다이얼로그 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: colors.orangeAccent[500],
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {selectedIssue ? selectedIssue.title : "Loading..."}
          <IconButton onClick={() => setDetailOpen(false)} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ backgroundColor: "#fffdf9", color: "#111", p: 3.5 }}>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
            </Box>
          ) : selectedIssue ? (
            <>
              {/* 상태칩 */}
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {(() => {
                  const s1 = sevChip(selectedIssue.severity, colors);
                  const s2 = statusChip(selectedIssue.status, colors);
                  return (
                    <>
                      <Chip size="small" label={s1.label} sx={{ ...s1.sx, fontWeight: 700 }} />
                      <Chip size="small" label={s2.label} sx={{ ...s2.sx, fontWeight: 700 }} />
                      <Chip
                        size="small"
                        label={(selectedIssue.issue_scope || "").toUpperCase()}
                        sx={{ bgcolor: colors.blueAccent[600], color: "#fff", fontWeight: 700 }}
                      />
                      <Chip
                        size="small"
                        label={(selectedIssue.impact || "").toUpperCase()}
                        sx={{ bgcolor: colors.greenAccent[600], color: "#fff", fontWeight: 700 }}
                      />
                    </>
                  );
                })()}
              </Box>

              {/* 제출 정보 */}
              <Typography variant="subtitle2" sx={{ color: "#555" }} mb={1}>
                Submitted by: <strong>{selectedIssue.author?.name || selectedIssue.submitted_by}</strong>{" "}
                ({selectedIssue.author?.role_name || "Unknown"}) • {formatEnDate(selectedIssue.created_at)}
              </Typography>

              {/* 관리자/멘토만 상태 변경 */}
              {(myRoleId === 1 || myRoleId === 2) && (
                <Stack direction="row" spacing={2} mt={2} mb={3}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Change Severity</InputLabel>
                    <Select
                      label="Change Severity"
                      value={selectedIssue.severity || "low"}
                      onChange={async (e) => {
                        const newSev = e.target.value;
                        try {
                          const token = localStorage.getItem("accessToken");
                          await axios.patch(
                            `${API}/issues/${selectedIssue.issue_id}/severity`,
                            { severity: newSev },
                            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                          );
                          setSelectedIssue((prev) => ({ ...prev, severity: newSev }));
                          setIssues((prev) =>
                            prev.map((it) =>
                              (it.issue_id ?? it._id) === selectedIssue.issue_id ? { ...it, severity: newSev } : it
                            )
                          );
                        } catch (err) {
                          console.error("PATCH /severity 실패:", err);
                          alert("Failed to update severity");
                        }
                      }}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={selectedIssue.status || "open"}
                      onChange={async (e) => {
                        const newStat = e.target.value;
                        try {
                          const token = localStorage.getItem("accessToken");
                          await axios.patch(
                            `${API}/issues/${selectedIssue.issue_id}/status`,
                            { status: newStat },
                            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                          );

                          setSelectedIssue((prev) => ({ ...prev, status: newStat }));
                          setIssues((prev) =>
                            prev.map((it) =>
                              (it.issue_id ?? it._id) === selectedIssue.issue_id ? { ...it, status: newStat } : it
                            )
                          );
                        } catch (err) {
                          if (newStat === "resolved") {
                            try {
                              const token = localStorage.getItem("accessToken");
                              await axios.patch(
                                `${API}/issues/${selectedIssue.issue_id}/resolve`,
                                {},
                                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                              );
                              setSelectedIssue((prev) => ({ ...prev, status: "resolved" }));
                              setIssues((prev) =>
                                prev.map((it) =>
                                  (it.issue_id ?? it._id) === selectedIssue.issue_id
                                    ? { ...it, status: "resolved" }
                                    : it
                                )
                              );
                            } catch (e2) {
                              console.error("PATCH /status & /resolve 실패:", e2);
                              alert("Failed to update status");
                            }
                          } else {
                            console.error("PATCH /status 실패:", err);
                            alert("Failed to update status");
                          }
                        }
                      }}
                    >
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {/* TEAM 섹션 */}
              {selectedIssue?.team?.members?.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle1" sx={{ color: "#e26d32", fontWeight: 700 }} mb={1}>
                    TEAM: {selectedIssue.team.team_name?.toUpperCase()}{" "}
                    {selectedIssue.team_id != null && `(ID: ${selectedIssue.team_id})`}
                  </Typography>

                  {(() => {
                    const members = selectedIssue.team.members || [];
                    const roleName = (m) => (m.role || m.role_name || "").toString().toLowerCase();
                    const roleId = (m) => Number(m.role_id);

                    const isStudent = (m) => roleId(m) === 3 || roleName(m) === "student";
                    const isMentor = (m) => roleId(m) === 2 || roleName(m) === "mentor";
                    const isAdmin = (m) => roleId(m) === 1 || roleName(m) === "admin";

                    const students = members
                      .filter((m) => isStudent(m) && !isAdmin(m))
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                    const mentors = members
                      .filter((m) => isMentor(m) && !isAdmin(m))
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

                    const renderMemberRow = (m) => (
                      <Box key={m.user_id || m._id || m.name} display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 26, height: 26, bgcolor: isMentor(m) ? "#2196f3" : "#4caf50" }}>
                          {(m.name?.[0] || "?").toUpperCase()}
                        </Avatar>
                        <Typography>
                          {m.name || "(Unknown)"}{" "}
                          <span style={{ color: "#888", fontSize: "0.8em" }}>
                            ({isMentor(m) ? "Mentor" : "Student"})
                          </span>
                        </Typography>
                      </Box>
                    );

                    return (
                      <Stack spacing={1}>
                        {mentors.length > 0 && (
                          <>
                            <Typography sx={{ fontWeight: 700, color: "#666", mt: 0.5 }}>MENTOR</Typography>
                            {mentors.map(renderMemberRow)}
                          </>
                        )}
                        {students.length > 0 && (
                          <>
                            <Typography sx={{ fontWeight: 700, color: "#666", mt: 1.5 }}>
                              STUDENTS ({students.length})
                            </Typography>
                            {students.map(renderMemberRow)}
                          </>
                        )}
                      </Stack>
                    );
                  })()}
                </Box>
              )}

              <Divider sx={{ my: 2, borderColor: "#f1e1d8" }} />

              {/* DESCRIPTION */}
              <Typography variant="subtitle1" sx={{ color: "#e26d32", fontWeight: 700 }} mb={1}>
                DESCRIPTION
              </Typography>
              <Typography variant="body1" sx={{ color: "#222" }} mb={3}>
                {selectedIssue.description || "No description provided."}
              </Typography>

              {/* ATTACHMENTS */}
              {selectedIssue.attachments?.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#222" }} mb={1}>
                    ATTACHMENTS
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {selectedIssue.attachments.map((file, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          borderRadius: 2,
                          backgroundColor: "#fff",
                          p: 1.25,
                          border: "1px solid #f1e1d8",
                        }}
                      >
                        {file.type?.startsWith("image/") ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }}
                          />
                        ) : (
                          <Typography
                            sx={{
                              cursor: "pointer",
                              color: "#e26d32",
                              "&:hover": { textDecoration: "underline" },
                            }}
                            onClick={() => window.open(file.url, "_blank")}
                          >
                            {file.name}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "#777" }}>
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </Typography>
                      </Box>
                    ))}
                    {myRoleId !== 3 && (
                      <Button
                        variant="contained"
                        sx={{
                          bgcolor: colors.orangeAccent[600],
                          color: "#fff",
                          fontWeight: 700,
                          "&:hover": { bgcolor: colors.orangeAccent[700] },
                        }}
                        onClick={() => setEmailDialogOpen(true)}
                      >
                        Send Email to Reporter
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              {/* Email Logs */}
              {selectedIssue.email_logs?.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#222" }} mb={1}>
                    EMAIL LOGS
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: "#fff",
                      border: "1px solid #f1e1d8",
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    {selectedIssue.email_logs
                      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
                      .map((log, idx) => (
                        <Box
                          key={idx}
                          display="flex"
                          flexDirection="column"
                          borderBottom={
                            idx < selectedIssue.email_logs.length - 1 ? "1px solid #eee" : "none"
                          }
                          py={1}
                        >
                          <Typography sx={{ fontSize: "0.9em" }}>
                            <b>{log.sender_name}</b> ({log.sender_role}) sent an email
                          </Typography>
                          <Typography sx={{ fontSize: "0.85em", color: "#777", ml: 1 }}>
                            Subject: {log.subject || "(no subject)"} • {formatEnDate(log.sent_at)}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <Typography color="#666">No issue data found.</Typography>
          )}
        </DialogContent>

        {/* 이메일 다이얼로그 */}
        <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle
            sx={{
              bgcolor: colors.orangeAccent[500],
              color: "#fff",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Send Email to Reporter
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ color: "#444" }}>
                To: <b style={{ color: colors.orangeAccent[500] }}>{selectedIssue?.author?.email || "Unknown"}</b>
              </Typography>
              <TextField
                label="Subject"
                fullWidth
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <TextField
                label="Message"
                fullWidth
                multiline
                minRows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </Stack>
          </DialogContent>

          <Box display="flex" justifyContent="flex-end" gap={1} p={2}>
            <Button onClick={() => setEmailDialogOpen(false)} sx={{ color: "#555" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{
                bgcolor: colors.orangeAccent[600],
                "&:hover": { bgcolor: colors.orangeAccent[700] },
                color: "#fff",
                fontWeight: 700,
              }}
              onClick={async () => {
                try {
                  const token = localStorage.getItem("accessToken");

                  // 보낸 사람 정보
                  const me = visibleUsers.find((u) => (u.user_id ?? u._id) === myUserId) || {};
                  const senderName = me.name || "Unknown";
                  const senderRoleLabel = myRoleId === 1 ? "Admin" : myRoleId === 2 ? "Mentor" : "User";

                  // 제목 가공: (Role: Name) 접미사 자동 부착
                  const baseSubject = (emailSubject ?? "").trim();
                  const suffix = ` (${senderRoleLabel}: ${senderName})`;

                  // 중복 접미사 방지
                  const hasRoleSuffix = /\((Admin|Mentor|User):\s*.+\)$/.test(baseSubject);
                  const subjectToSend =
                    baseSubject.length === 0
                      ? `Re: Issue ${selectedIssue.issue_id}${suffix}`
                      : hasRoleSuffix || baseSubject.endsWith(suffix)
                      ? baseSubject
                      : `${baseSubject}${suffix}`;

                  // 이메일 전송
                  await axios.post(
                    `${API}/issues/${selectedIssue.issue_id}/email`,
                    { subject: subjectToSend, message: emailMessage },
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                  );

                  // 이메일 로그 업데이트
                  const newLog = {
                    sender_user_id: myUserId,
                    sender_name: senderName,
                    sender_role: senderRoleLabel,
                    subject: subjectToSend,
                    sent_at: new Date(),
                  };

                  setSelectedIssue((prev) => ({
                    ...prev,
                    email_logs: [...(prev?.email_logs || []), newLog],
                  }));

                  setEmailDialogOpen(false);
                  setEmailSubject("");
                  setEmailMessage("");
                  alert("✅ Email sent successfully!");
                } catch (e) {
                  console.error("Failed to send email:", e);
                  alert("❌ Failed to send email");
                }
              }}
            >
              Send
            </Button>
          </Box>
        </Dialog>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
