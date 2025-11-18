import React, { useContext, useState, useEffect } from "react";
import {
  Box,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  TextField,
  Stack,
  Divider,
  Typography,
} from "@mui/material";
import { ColorModeContext, tokens } from "../../theme";
import NotificationAddOutlinedIcon from "@mui/icons-material/NotificationAddOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);
  const [openLogout, setOpenLogout] = useState(false);
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    address: "",
    city: "",
    zip_code: "",
    password: "",
    confirmPassword: "",
  });

  // ✅ axios debug log
  axios.interceptors.request.use((config) => {
    console.log("📡 Request URL:", config.url);
    return config;
  });

  // ✅ 유저 정보 불러오기
  useEffect(() => {
    const at = localStorage.getItem("accessToken");
    if (!at) return;

    axios
      .get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${at}` },
      })
      .then((res) => {
        const data = res.data || {};
        setUser(data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          mobile: data.mobile || "",
          address: data.address || "",
          city: data.city || "",
          zip_code: data.zip_code || "",
          password: "",
          confirmPassword: "",
        });
        setPreview(data.avatar_url || null);
      })
      .catch(() => console.error("유저 정보 불러오기 실패"));
  }, []);

  // ✅ 프로필 저장
  const handleSave = async () => {
    try {
      if (form.password && form.password !== form.confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      const at = localStorage.getItem("accessToken");
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value && key !== "confirmPassword") formData.append(key, value);
      });
      if (preview && preview.startsWith("data:")) {
        formData.append("avatar", dataURLtoFile(preview, "profile.png"));
      }

      await axios.patch(`${API}/users/me`, formData, {
        headers: {
          Authorization: `Bearer ${at}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Profile updated successfully!");
      setOpenProfile(false);
    } catch (err) {
      console.error("프로필 업데이트 실패:", err);
      alert("Failed to update profile");
    }
  };

  // ✅ 이미지 업로드 (미리보기)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // 🔧 dataURL → File 변환 헬퍼
  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  // ✅ 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/");
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" p={2}>
        {/* Left: AUT 로고 */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          backgroundColor="#000"
          borderRadius="3px"
          p={1}
        >
          <img
            src={`../../assets/AUT-logo-block.jpg`}
            alt="AUT Logo"
            style={{ height: "60px", objectFit: "contain" }}
          />
        </Box>

        {/* Right: Icon Buttons */}
        <Box display="flex" alignItems="center">
          {/* <IconButton>
            <NotificationAddOutlinedIcon />
          </IconButton>
          <IconButton>
            <SettingsOutlinedIcon />
          </IconButton> */}
          <IconButton onClick={() => setOpenProfile(true)}>
            <PersonOutlinedIcon sx={{ fontSize: 35, }}/>
          </IconButton>

          {/* 🔒 Logout 아이콘 */}
          <IconButton onClick={handleLogout}>
            <LogoutOutlinedIcon sx={{ fontSize: 35, color: "#e26d32" }} />
          </IconButton>
        </Box>
      </Box>

      {/* ✅ 로그아웃 확인 다이얼로그
      <Dialog open={openLogout} onClose={() => setOpenLogout(false)}>
        <DialogTitle
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            bgcolor: "#e26d32",
            color: "#fff",
            py: 1.5,
          }}
        >
          Log Out 
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          <Typography>Are you sure you want to log out?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button
            onClick={() => setOpenLogout(false)}
            sx={{
              border: "1px solid #ccc",
              color: "#555",
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLogout}
            sx={{
              bgcolor: "#e26d32",
              "&:hover": { bgcolor: "#cf5920" },
            }}
          >
            Log Out
          </Button>
        </DialogActions>
      </Dialog> */}

      {/* ✅ 프로필 다이얼로그 */}
      <Dialog
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        {/* 상단 제목바 */}
        <DialogTitle
          sx={{
            bgcolor: "#e26d32",
            color: "#fff",
            fontWeight: "bold",
            textAlign: "center",
            py: 2,
          }}
        >
          Edit Profile
        </DialogTitle>

        <DialogContent dividers sx={{ backgroundColor: "#fff", p: 4 }}>
          <Stack alignItems="center" spacing={2}>
            {/* 🧑‍💼 프로필 사진 */}
            <Avatar
              src={preview || "/assets/user.jpeg"}
              sx={{
                width: 100,
                height: 100,
                border: "3px solid #e26d32",
                mb: 1,
              }}
            />
            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{
                color: "#e26d32",
                borderColor: "#e26d32",
                "&:hover": {
                  borderColor: "#d85d1f",
                  backgroundColor: "#fff4ec",
                },
              }}
            >
              Change Photo
              <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            </Button>

            {/* 📝 폼 입력 */}
            {["name", "email", "mobile", "address", "city", "zip_code"].map((field) => (
              <TextField
                key={field}
                label={
                  field === "mobile"
                    ? "Mobile (NZ Format)"
                    : field === "zip_code"
                    ? "Zip Code"
                    : field.charAt(0).toUpperCase() + field.slice(1)
                }
                fullWidth
                type={field.includes("password") ? "password" : "text"}
                value={form[field]}
                onChange={(e) =>
                  setForm({ ...form, [field]: e.target.value })
                }
                error={
                  field === "mobile" &&
                  form.mobile &&
                  !/^02\d{7,9}$/.test(form.mobile)
                }
                helperText={
                  field === "mobile" &&
                  form.mobile &&
                  !/^02\d{7,9}$/.test(form.mobile)
                    ? "Enter a valid NZ mobile number (e.g. 021234567)"
                    : ""
                }
                sx={{
                  "& label.Mui-focused": { color: "#e26d32" },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                    borderColor: "#e26d32",
                  },
                }}
              />
            ))}

            {/* 🔸 비밀번호 변경 섹션 */}
            <Divider sx={{ my: 2, width: "100%", borderColor: "#e26d32" }} />
            <Typography
              variant="subtitle1"
              sx={{ alignSelf: "flex-start", color: "#e26d32", fontWeight: "bold" }}
            >
              Change Password
            </Typography>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              sx={{
                "& label.Mui-focused": { color: "#e26d32" },
                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                  borderColor: "#e26d32",
                },
              }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              sx={{
                "& label.Mui-focused": { color: "#e26d32" },
                "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                  borderColor: "#e26d32",
                },
              }}
            />
          </Stack>
        </DialogContent>

        {/* 하단 버튼 */}
        <DialogActions sx={{ bgcolor: "#fff", px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenProfile(false)}
            variant="contained"
            disabled={!/^02\d{7,9}$/.test(form.mobile)}
            sx={{
              bgcolor: "#e26d32",
              "&:hover": { bgcolor: "#cf5920" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!/^02\d{7,9}$/.test(form.mobile)}
            sx={{
              bgcolor: "#e26d32",
              "&:hover": { bgcolor: "#cf5920" },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Topbar;
