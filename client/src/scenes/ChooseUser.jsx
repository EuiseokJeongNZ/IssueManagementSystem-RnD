// client/src/scenes/ChooseUser.jsx
import React, { useState } from "react";
import {
  Box, Container, Grid, Paper, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Checkbox, FormControlLabel,
  IconButton, Link
} from "@mui/material";
import { AccountCircle, School, Group, Visibility, VisibilityOff } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import { tokens } from "../theme";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// 선택한 카드 ↔ 서버 role_id 매핑
const ROLE_MAP = {
  Admin: 1,
  Mentor: 2,
  Student: 3,
};

const ChooseUser = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("User"); // 현재 선택 카드
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ id: "", password: "", remember: false });
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const cardData = [
    { key: "Admin",   icon: <AccountCircle sx={{ fontSize: 48, color: colors.orangeAccent[500] }} />, title: "Admin",   desc: "View and resolve all issues across teams." },
    { key: "Mentor",  icon: <Group         sx={{ fontSize: 48, color: colors.orangeAccent[500] }} />, title: "Mentor",  desc: "View & resolve issues for your assigned team(s)." },
    { key: "Student", icon: <School        sx={{ fontSize: 48, color: colors.orangeAccent[500] }} />, title: "Student", desc: "View team issues and your own issues." },
  ];

  const handleOpen = (r) => { setRole(r); setOpen(true); };
  const handleClose = () => setOpen(false);

  const onChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm((v) => ({ ...v, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.id || !form.password) {
      alert("Please enter your ID and password.");
      return;
    }
    setSubmitting(true);
    try {
      // 서버는 id(autId/user_id/email)와 password만 필요
      const res = await axios.post(
        `${API}/auth/login`,
        { id: form.id, password: form.password, requestedRole: role }, // requestedRole은 참고용(서버가 써도 되고 무시해도 됨)
        { withCredentials: true }
      );

      const { accessToken, user } = res.data || {};
      if (!user || !user.role_id) {
        throw new Error("Invalid login response");
      }

      // ✅ 선택한 카드와 실제 사용자 역할이 일치하는지 검증
      const expectedRoleId = ROLE_MAP[role];
      if (expectedRoleId && Number(user.role_id) !== expectedRoleId) {
        // 혹시 토큰이 들어왔으면 제거
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authUser");
        alert(`You selected "${role}" but your account role is "${roleNameFromId(user.role_id)}".\nPlease choose the correct role card.`);
        return;
      }

      // ✅ 일치할 때만 저장 & 이동
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("authUser", JSON.stringify(user));
      window.dispatchEvent(new Event("auth:updated"));
      setOpen(false);

      // 필요하면 역할별 라우팅 분기
      // 여기선 모두 대시보드로
      navigate("/dashboard");
    } catch (err) {
      console.error(err?.response?.data || err.message);
      alert("Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 상단 중앙 로고 */}
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <Box component="img" src="/assets/AUT-logo-tab.jpg" alt="AUT Logo" sx={{ width: 170 }} />
      </Box>

      {/* 본문(오렌지 배경) */}
      <Box
        sx={{
          minHeight: "100vh",
          background: `linear-gradient(180deg, #ff7700 0%, #ff5500 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {cardData.map((card) => (
              <Grid item xs={12} sm={6} md={4} key={card.key}>
                <Paper
                  elevation={4}
                  onClick={() => handleOpen(card.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOpen(card.key)}
                  sx={{
                    p: 4, textAlign: "center", borderRadius: "12px",
                    backgroundColor: "#fff", color: "#111",
                    transition: "all 0.25s ease", cursor: "pointer",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" },
                  }}
                >
                  <Box mb={2}>{card.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#111" }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.7)" }}>
                    {card.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* 로그인 모달 */}
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: { xs: 2, md: 3 } } }}
        >
          <DialogTitle sx={{ textAlign: "center", fontWeight: 800, fontSize: 28, pb: 1 }}>
            {role} Login
          </DialogTitle>
          <Typography align="center" sx={{ color: "rgba(0,0,0,0.7)", mb: 2 }}>
            Welcome back! Please enter your details
          </Typography>

          <DialogContent dividers sx={{ border: "none" }}>
            <Box component="form" onSubmit={onSubmit} noValidate>
              <TextField
                fullWidth
                label="Enter your ID *"
                placeholder="AUT ID *"
                variant="outlined"
                margin="normal"
                name="id"
                value={form.id}
                onChange={onChange}
                autoFocus
              />
              <Box position="relative">
                <TextField
                  fullWidth
                  label="Password *"
                  variant="outlined"
                  margin="normal"
                  name="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={onChange}
                />
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPw((s) => !s)}
                  sx={{ position: "absolute", right: 8, top: 22 }}
                >
                  {showPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Box>

              <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                <FormControlLabel
                  control={<Checkbox checked={form.remember} onChange={onChange} name="remember" />}
                  label="Remember me"
                />
                <Link href="#" underline="hover" sx={{ color: colors.orangeAccent[500], fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </Box>

              <DialogActions
                sx={{
                  px: 0, pt: 2, display: "flex", flexDirection: "column",
                  alignItems: "stretch", gap: 1.5
                }}
              >
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{
                    py: 1.2,
                    backgroundColor: colors.orangeAccent[500],
                    fontWeight: 700,
                    "&:hover": { backgroundColor: colors.orangeAccent[400] },
                  }}
                >
                  {submitting ? "LOGGING IN..." : `LOGIN AS ${role.toUpperCase()}`}
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </>
  );
};

export default ChooseUser;

// ---- helpers ----
function roleNameFromId(id) {
  switch (Number(id)) {
    case 1: return "Admin";
    case 2: return "Mentor";
    case 3: return "Student";
    default: return `Role ${id}`;
  }
}
