import React, { useEffect, useState, useMemo } from "react";
import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  AdminPanelSettingsOutlined as AdminIcon,
  LockOpenOutlined as StudentIcon,
  SecurityOutlined as MentorIcon,
} from "@mui/icons-material";
import { tokens } from "../theme";
import Header from "../components/Header";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Contacts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [users, setUsers] = useState([]);
  const [myRoleId, setMyRoleId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 나(로그인 사용자) + 유저 리스트 동시 로드
        const [meRes, usersRes] = await Promise.all([
          axios.get(`${API}/users/me`, { headers, withCredentials: true }),
          axios.get(`${API}/users`, { headers, withCredentials: true }),
        ]);

        if (!alive) return;

        const me = meRes.data || {};
        setMyRoleId(me.role_id ?? null);

        const data = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data.items || [];

        // ✅ 이 페이지를 Admin이 보고 있을 때 → Admin 행은 숨김
        const visible = me.role_id === 1 ? data.filter(u => u.role_id !== 1) : data;

        setUsers(visible);
      } catch (err) {
        console.error("GET /users 실패:", err?.response?.data || err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ 컬럼 정의 (Mentor/Admin 행은 Team을 '-'로 표시)
  const columns = useMemo(
    () => [
      {
        field: "team_name",
        headerName: "Team",
        flex: 1,
        minWidth: 140,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => {
          const role = Number(p.row.role_id);
          if (role === 1 || role === 2) return "-"; // Admin / Mentor는 항상 '-'
          if (Array.isArray(p.row.team_names) && p.row.team_names.length) {
            return p.row.team_names.join(", ");
          }
          return p.row.team_name || "-";
        },
      },
      {
        field: "user_autId",
        headerName: "Aut ID",
        flex: 1,
        minWidth: 100,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => p.row.user_autId || "-",
      },
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 140,
        align: "center",
        headerAlign: "center",
        cellClassName: "name-column--cell",
        valueGetter: (p) => p.row.name || "-",
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1.4,
        minWidth: 200,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => p.row.email || "-",
      },
      {
        field: "role_id",
        headerName: "Role",
        flex: 0.9,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => {
          let roleLabel = "-";
          let icon = null;
          let bgColor = colors.orangeAccent[700];

          switch (value) {
            case 1:
              roleLabel = "Admin";
              icon = <AdminIcon fontSize="small" />;
              bgColor = colors.orangeAccent[600];
              break;
            case 2:
              roleLabel = "Mentor";
              icon = <MentorIcon fontSize="small" />;
              bgColor = colors.orangeAccent[700];
              break;
            case 3:
              roleLabel = "Student";
              icon = <StudentIcon fontSize="small" />;
              bgColor = colors.orangeAccent[800];
              break;
            default:
              roleLabel = "-";
          }

          return (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="200%"
              px={1}
              py={0.5}
              borderRadius="6px"
              bgcolor={bgColor}
              sx={{ textAlign: "center", gap: "5px", height: "28px" }}
            >
              {icon}
              <Typography color={colors.orangeAccent[100]} fontWeight={600} fontSize="0.85rem">
                {roleLabel}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "mobile",
        headerName: "Phone",
        flex: 1,
        align: "center",
        headerAlign: "center",
        minWidth: 120,
        valueGetter: (p) => p.row.mobile || "-",
      },
      {
        field: "address",
        headerName: "Address",
        flex: 1,
        align: "center",
        headerAlign: "center",
        minWidth: 150,
        valueGetter: (p) => p.row.address || "-",
      },
      {
        field: "city",
        headerName: "City",
        flex: 1,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => p.row.city || "-",
      },
      {
        field: "zip_code",
        headerName: "Zip Code",
        flex: 1,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => p.row.zip_code || "-",
      },
    ],
    [colors]
  );

  const rows = useMemo(
    () =>
      users.map((u, idx) => ({
        id: idx + 1,
        team_name: u.team_name || "-",
        team_names: u.team_names || undefined, // 멘토가 여러 팀이면 배열 사용 가능
        user_autId: u.user_autId || "-",
        name: u.name || "-",
        email: u.email || "-",
        role_id: u.role_id,
        mobile: u.mobile || "-",
        address: u.address || "-",
        city: u.city || "-",
        zip_code: u.zip_code || "-",
        avatar_url: u.avatar_url || null,
      })),
    [users]
  );

  return (
    <Box m="20px">
      <Header
        title={<span style={{ color: "#000", fontWeight: "700" }}>CONTACTS</span>}
        subtitle={<span style={{ color: "#000" }}>Team & User Overview</span>}
      />

      <Box
        m="40px 0 0 0"
        height="75vh"
        sx={{
          "& .MuiDataGrid-root": { border: "none", color: "#000" },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          "& .name-column--cell": { fontWeight: 600 },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.orangeAccent[400],
            borderBottom: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
          },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.orangeAccent[400],
            color: "#fff",
          },
          "& .MuiCheckbox-root": { color: `${colors.orangeAccent[200]} !important` },
          "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-input, & .MuiTablePagination-displayedRows": {
            color: "#fff !important",
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: `${colors.orangeAccent[900]} !important`,
          },
        }}
      >
        {loading ? (
          <Box height="100%" display="flex" alignItems="center" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            checkboxSelection
            rows={rows}
            columns={columns}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: "team_name", sort: "asc" }] },
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </Box>
    </Box>
  );
};

export default Contacts;
