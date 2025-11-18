import { useEffect, useMemo, useState } from "react";
import { Sidebar, Menu, MenuItem, useProSidebar } from "react-pro-sidebar";
import {
  Box,
  IconButton,
  Typography,
  useTheme,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ROLE_LABELS = {
  1: "Admin",
  2: "Mentor",
  3: "Student",
  4: "Moderator",
  5: "Teaching Team",
  6: "IT Person",
};

// Sidebar 메뉴 아이템
const Item = ({ title, to, icon, selected, setSelected, isCollapsed }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      <MenuItem
        active={selected === title}
        style={{ color: "#fff" }}
        onClick={() => setSelected(title)}
        icon={icon}
      >
        {!isCollapsed && <Typography>{title}</Typography>}
      </MenuItem>
    </NavLink>
  );
};

export default function Sidebar1() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { collapseSidebar } = useProSidebar();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser") || "null");
    } catch {
      return null;
    }
  });

  const [teamName, setTeamName] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userInfo, setUserInfo] = useState({
    mobile: "-",
    address: "-",
    city: "-",
    zip_code: "-",
  });
  const [openProfile, setOpenProfile] = useState(false);

  // 로그인 정보 갱신 이벤트 리스너
  useEffect(() => {
    const onAuth = () => {
      try {
        const u = JSON.parse(localStorage.getItem("authUser") || "null");
        setUser(u);
      } catch {}
    };
    window.addEventListener("auth:updated", onAuth);
    return () => window.removeEventListener("auth:updated", onAuth);
  }, []);

  // 사용자 상세 정보 불러오기
  useEffect(() => {
    const at = localStorage.getItem("accessToken");
    if (!user || !at) return;

    axios
      .get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${at}` },
        withCredentials: true,
      })
      .then((res) => {
        const data = res.data || {};
        setTeamName(data.team_name || null);
        setAvatarUrl(data.avatar_url || null);

        setUserInfo({
          mobile: data.mobile || "-",
          address: data.address || "-",
          city: data.city || "-",
          zip_code: data.zip_code || "-",
        });

        // 최신 프로필을 로컬에도 반영
        if (data?.name || data?.role_id || data?.email) {
          const merged = {
            ...user,
            name: data.name,
            role_id: data.role_id,
            email: data.email,
          };
          setUser(merged);
          localStorage.setItem("authUser", JSON.stringify(merged));
        }
      })
      .catch(() => {
        setTeamName(null);
      });
  }, [user]);

  const roleLabel = useMemo(
    () => (user?.role_id ? ROLE_LABELS[user.role_id] || `Role ${user.role_id}` : "Guest"),
    [user]
  );

  const canSubmitIssue = user?.role_id === 3; // 학생만 허용

  return (
    <Box
      sx={{
        "& .ps-sidebar-container": {
          background: `${colors.orangeAccent[500]} !important`,
        },
        "& .ps-menuitem-root": { color: "#fff !important" },
        "& .ps-menu-button:hover": {
          backgroundColor: `${colors.orangeAccent[700]} !important`,
        },
        "& .ps-active": {
          backgroundColor: `${colors.orangeAccent[300]} !important`,
          color: "#fff !important",
        },
      }}
    >
      <div style={{ display: "flex", height: "100%" }}>
        <Sidebar>
          {/* Collapse Toggle */}
          <main style={{ textAlign: isCollapsed ? "center" : "right" }}>
            <IconButton
              onClick={() => {
                collapseSidebar();
                setIsCollapsed(!isCollapsed);
              }}
            >
              <MenuOutlinedIcon htmlColor="#fff" />
            </IconButton>
          </main>

          <Menu>
            {/* 프로필 */}
            {!isCollapsed && (
              <Box mb="25px" mt="25px">
                <Box display="flex" justifyContent="center" alignItems="center">
                  <Avatar
                    alt="profile-user"
                    src={avatarUrl || "/assets/user.jpeg"}
                    sx={{
                      width: 100,
                      height: 100,
                      cursor: "pointer",
                      border: "2px solid white",
                    }}
                    onClick={() => setOpenProfile(true)}
                  />
                </Box>

                <Box textAlign="center" mt={1}>
                  <Typography variant="h2" color="#fff" fontWeight="bold" sx={{ m: "10px 0 0 0" }}>
                    {user?.name || "UserName"}
                  </Typography>
                  <Typography variant="h6" color="#fff">
                    {roleLabel}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* 메뉴 */}
            <Box paddingLeft={isCollapsed ? undefined : "5%"}>
              {/* Dashboard */}
              <Item
                title="Dashboard"
                to="/dashboard"
                icon={<HomeOutlinedIcon htmlColor="#fff" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />

              {/* Section: Data */}
              {!isCollapsed && (
                <Typography variant="h6" color="#fff" sx={{ m: "15px 0 5px 10px", opacity: 0.8 }}>
                  Data
                </Typography>
              )}
              <Item
                title="Contacts Information"
                to="/contacts"
                icon={<ContactsOutlinedIcon htmlColor="#fff" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />

              {/* Section: Pages */}
              {!isCollapsed && (
                <Typography variant="h6" color="#fff" sx={{ m: "15px 0 5px 10px", opacity: 0.8 }}>
                  Pages
                </Typography>
              )}

              {/* ✅ 학생만 ‘Submit New Issue’ 표시 */}
              {canSubmitIssue && (
                <Item
                  title="Submit New Issue"
                  to="/form"
                  icon={<PersonOutlinedIcon htmlColor="#fff" />}
                  selected={selected}
                  setSelected={setSelected}
                  isCollapsed={isCollapsed}
                />
              )}

              <Item
                title="Timetable"
                to="/calendar"
                icon={<CalendarTodayOutlinedIcon htmlColor="#fff" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />

              {/* Section: Charts */}
              {!isCollapsed && (
                <Typography variant="h6" color="#fff" sx={{ m: "15px 0 5px 10px", opacity: 0.8 }}>
                  Charts
                </Typography>
              )}
              <Item
                title="Pie Chart"
                to="/pie"
                icon={<PieChartOutlineOutlinedIcon htmlColor="#fff" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />
              <Item
                title="Line Chart"
                to="/line"
                icon={<TimelineOutlinedIcon htmlColor="#fff" />}
                selected={selected}
                setSelected={setSelected}
                isCollapsed={isCollapsed}
              />
            </Box>
          </Menu>
        </Sidebar>
      </div>

      {/* 프로필 다이얼로그 */}
      <Dialog open={openProfile} onClose={() => setOpenProfile(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#e26d32",
            color: "#fff",
            fontWeight: "bold",
            textAlign: "center",
            py: 2,
          }}
        >
          User Profile
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.2} alignItems="center">
            <Avatar
              alt="User Avatar"
              src={avatarUrl || "/assets/user.jpeg"}
              sx={{ width: 120, height: 120, mb: 2 }}
            />
            <Typography>
              <b>User AUT ID:</b> {user?.user_autId ?? "-"}
            </Typography>
            <Typography>
              <b>Name:</b> {user?.name || "-"}
            </Typography>
            <Typography>
              <b>Email:</b> {user?.email || "-"}
            </Typography>
            <Typography>
              <b>Role:</b> {roleLabel}
            </Typography>
            <Typography>
              <b>Team:</b> {teamName || "-"}
            </Typography>
            <Typography>
              <b>Mobile:</b> {userInfo.mobile}
            </Typography>
            <Typography>
              <b>Address:</b> {userInfo.address}
            </Typography>
            <Typography>
              <b>City:</b> {userInfo.city}
            </Typography>
            <Typography>
              <b>Zip Code:</b> {userInfo.zip_code}
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenProfile(false)}
            sx={{
              border: "1px solid #fff",
              color: "#fff",
              borderRadius: "10px",
              px: 3,
              py: 1,
              fontWeight: 600,
              bgcolor: "#e26d32",
              "&:hover": { bgcolor: "#cf5920" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
