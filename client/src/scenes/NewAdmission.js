import { useMemo, useState } from "react";
import {
  Box, Button, TextField, Select, MenuItem, InputLabel, FormControl,
  RadioGroup, FormControlLabel, Radio, Snackbar, Alert, Typography,
  useTheme, CircularProgress
} from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../components/Header";
import { tokens } from "../theme";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DRAFT_KEY = "issueFormDraft_v2";

/* ---------- validation ---------- */
const schema = yup.object().shape({
  title: yup.string().required("Title is required"),
  description: yup
    .string()
    .max(500, "Max 500 characters")
    .required("Description is required"),
  severity: yup.string().oneOf(["Low", "Medium", "High"]).required(),
  scope: yup.string().oneOf(["Individual", "Team"]).required(),
  issueType: yup.string().oneOf(["student", "team"]).nullable(),
  semester: yup.string().oneOf(["S1", "S2", "SS"]).required(),
});

/* ---------- initial ---------- */
const initialValues = {
  title: "",
  description: "",
  severity: "Medium",
  scope: "Individual",
  issueType: null,
  semester: "S1",
  attachments: [], // File[] 유지
};

export default function SubmitIssue() {
  const isNonMobile = useMediaQuery("(min-width:600px)");
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [openSnack, setOpenSnack] = useState(false);
  const [busy, setBusy] = useState(false); // 제출/업로드 상태

  // axios 전역 auth (새로고침 후에도 붙도록)
  const token = localStorage.getItem("accessToken");
  if (token && !axios.defaults.headers.common.Authorization) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  /* ---------- draft load ---------- */
  const loadDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...initialValues, ...parsed, attachments: [] }; // File은 복구 X
    } catch {
      return initialValues;
    }
  }, []);

  /* ---------- helpers ---------- */
  const handleChangeAndSave =
    (handleChange, values) =>
    (event) => {
      handleChange(event);
      const updated = { ...values, [event.target.name]: event.target.value };
      delete updated.attachments;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    };

  // S3 presign으로 여러 파일 업로드
const uploadAllToS3 = async (files) => {
  if (!files?.length) return [];

  // 1) 서버에서 presign들 발급 (★ /api 없음)
  const meta = files.map((f) => ({ name: f.name, type: f.type }));
  const { data } = await axios.post(`${API}/uploads/presign-batch`, { files: meta });

  // 서버가 배열로 주거나 {items: []}로 줄 수도 있으니 방어
  const presigned = Array.isArray(data) ? data : data?.items || [];
  if (!presigned.length) return [];

  // 2) 브라우저 → S3 직접 업로드
  await Promise.all(
    presigned.map(async (p, idx) => {
      const form = new FormData();
      Object.entries(p.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", files[idx]);
      const resp = await fetch(p.url, { method: "POST", body: form });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`S3 upload failed: ${resp.status} ${text}`);
      }
    })
  );
    // 3) 클라가 서버로 보낼 첨부 배열
  return presigned.map((p, idx) => ({
      key: p.key,
      url: p.publicUrl || `${p.url}/${p.fields.key}`,
      name: files[idx].name,
      type: files[idx].type,
      size: files[idx].size,
    }));
  };

  /* ---------- submit ---------- */
  const handleFormSubmit = async (values, helpers) => {
    if (busy) return;
    setBusy(true);
    try {
      const severity = values.severity.toLowerCase(); // low|medium|high
      const issue_scope = values.scope === "Team" ? "team" : "individual";
      const semester = values.semester === "S2" ? 2 : 1;

      // 1) 첨부 업로드
      const attachments = await uploadAllToS3(values.attachments);

      // 2) 이슈 생성 (★ /api 없음)
      const payload = {
        title: values.title,
        description: values.description,
        severity,
        impact: issue_scope === "team" ? "group" : "individual",
        issue_scope,
        semester,
        attachments,
        createInitialComment: true,
      };
      const res = await axios.post(`${API}/issues`, payload, { withCredentials: true });

      // 3) 필요하면 코멘트 생성 (서버 미지원 대비)
      const issueId = res?.data?.issue?.issue_id ?? res?.data?.issue_id ?? res?.data?.id ?? null;
      if (issueId) {
        try {
          await axios.post(
            `${API}/issues/${issueId}/comments`,
            { content: values.description, attachments },
            { withCredentials: true }
          );
        } catch (e) {
          console.warn("create comment failed:", e?.response?.data || e.message);
        }
      }

      setOpenSnack(true);
      localStorage.removeItem(DRAFT_KEY);
      helpers.resetForm({ values: initialValues });
    } catch (err) {
      console.error("[Submit Issue] failed:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Submit failed. Check console.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <Box m="20px">
      <Header
        title={<span style={{ color: colors.primary[100], fontWeight: 700 }}>SUBMIT NEW ISSUE</span>}
        subtitle={<span style={{ color: colors.primary[100] }}>Report a New Issue</span>}
      />

      <Formik initialValues={loadDraft} validationSchema={schema} onSubmit={handleFormSubmit}>
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue }) => {
          const descLen = values.description?.length ?? 0;

          const onFilesSelected = (e) => {
            const files = Array.from(e.target.files || []);
            const next = [...(values.attachments || []), ...files];
            setFieldValue("attachments", next);
            const { attachments, ...rest } = values;
            localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
          };

          const removeAttachment = (idx) =>
            setFieldValue(
              "attachments",
              (values.attachments ?? []).filter((_, i) => i !== idx)
            );

          const clearAttachments = () => setFieldValue("attachments", []);

          return (
            <form onSubmit={handleSubmit}>
              <Box
                display="grid"
                gap="24px"
                gridTemplateColumns="repeat(4, minmax(0, 1fr))"
                sx={{ "& > *": { gridColumn: isNonMobile ? undefined : "span 4" } }}
              >
                <TextField
                  fullWidth variant="filled" label="Title" name="title"
                  value={values.title} onChange={handleChangeAndSave(handleChange, values)}
                  onBlur={handleBlur}
                  error={!!touched.title && !!errors.title}
                  helperText={touched.title && errors.title}
                  sx={{ gridColumn: "span 4" }}
                />

                <Box sx={{ gridColumn: "span 4" }}>
                  <TextField
                    fullWidth multiline minRows={4} variant="filled" label="Description"
                    name="description" value={values.description}
                    onChange={handleChangeAndSave(handleChange, values)}
                    onBlur={handleBlur}
                    error={!!touched.description && !!errors.description}
                    helperText={touched.description && errors.description}
                  />
                  <Box display="flex" justifyContent="flex-end" mt={0.5}>
                    <Typography variant="caption" color={descLen > 500 ? "error" : colors.gray[100]}>
                      {descLen}/500
                    </Typography>
                  </Box>
                </Box>

                <FormControl variant="filled" sx={{ gridColumn: "span 2" }}>
                  <InputLabel>Severity</InputLabel>
                  <Select name="severity" value={values.severity} onChange={handleChangeAndSave(handleChange, values)}>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>

                <FormControl variant="filled" sx={{ gridColumn: "span 2" }}>
                  <InputLabel>Issue Scope</InputLabel>
                  <Select
                    name="scope"
                    value={values.scope}
                    onChange={(e) => {
                      handleChangeAndSave(handleChange, values)(e);
                      if (e.target.value === "Individual") {
                        setFieldValue("issueType", null);
                      } else if (!values.issueType) {
                        setFieldValue("issueType", "team");
                      }
                    }}
                  >
                    <MenuItem value="Individual">Individual</MenuItem>
                    <MenuItem value="Team">Team</MenuItem>
                  </Select>
                </FormControl>

                {values.scope !== "Individual" && (
                  <FormControl sx={{ gridColumn: "span 4" }}>
                    <RadioGroup
                      row
                      name="issueType"
                      value={values.issueType ?? "team"}
                      onChange={handleChangeAndSave(handleChange, values)}
                    >
                      <FormControlLabel value="student" control={<Radio />} label="Student issue" />
                      <FormControlLabel value="team" control={<Radio />} label="Group (Team)" />
                    </RadioGroup>
                  </FormControl>
                )}

                <FormControl variant="filled" sx={{ gridColumn: "span 4" }}>
                  <InputLabel>Semester</InputLabel>
                  <Select name="semester" value={values.semester} onChange={handleChangeAndSave(handleChange, values)}>
                    <MenuItem value="S1">Semester 1</MenuItem>
                    <MenuItem value="S2">Semester 2</MenuItem>
                  </Select>
                </FormControl>

                {/* Attachments */}
                <Box sx={{ gridColumn: "span 4" }}>
                  <Box display="flex" gap={1} alignItems="center" mb={1}>
                    <Button
                      variant="outlined"
                      component="label"
                      disabled={busy}
                      sx={{
                        borderColor: colors.orangeAccent[500],
                        color: colors.orangeAccent[500],
                        "&:hover": { borderColor: colors.orangeAccent[400], background: "transparent" },
                      }}
                    >
                      Upload Attachments
                      <input hidden type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={onFilesSelected} />
                    </Button>
                    {!!(values.attachments?.length) && (
                      <Button size="small" onClick={clearAttachments} sx={{ color: colors.gray[100] }}>
                        Clear All
                      </Button>
                    )}
                  </Box>

                  {!!(values.attachments?.length) && (
                    <Box display="flex" gap={1.5} flexWrap="wrap">
                      {(values.attachments ?? []).map((f, idx) => {
                        const isImg = f.type?.startsWith("image/");
                        const url = isImg ? URL.createObjectURL(f) : null;
                        return (
                          <Box
                            key={`${f.name}-${idx}`}
                            sx={{
                              width: 110, borderRadius: 2, overflow: "hidden",
                              border: `1px solid ${colors.primary[500]}`, backgroundColor: colors.primary[400],
                            }}
                          >
                            <Box position="relative" width="100%" height={84} display="flex" alignItems="center" justifyContent="center">
                              {isImg ? (
                                <img
                                  src={url} alt={f.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onLoad={() => url && URL.revokeObjectURL(url)}
                                />
                              ) : (
                                <Typography variant="caption" sx={{ px: 1, textAlign: "center" }}>
                                  {f.name}
                                </Typography>
                              )}
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" px={1} py={0.5}>
                              <Typography variant="caption" noWrap title={f.name} sx={{ maxWidth: 70 }}>
                                {f.name}
                              </Typography>
                              <Button size="small" onClick={() => removeAttachment(idx)} sx={{ minWidth: 0, color: colors.orangeAccent[500] }}>
                                ✕
                              </Button>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box display="flex" justifyContent="flex-end" mt="20px" gap={1}>
                <Button
                  variant="text"
                  onClick={() => { localStorage.removeItem(DRAFT_KEY); window.location.reload(); }}
                  sx={{ color: colors.gray[100] }}
                  disabled={busy}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  startIcon={busy ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : null}
                  sx={{
                    backgroundColor: colors.orangeAccent[500],
                    color: "#fff", fontWeight: "bold",
                    "&:hover": { backgroundColor: colors.orangeAccent[400] },
                  }}
                >
                  {busy ? "Submitting..." : "Submit Issue"}
                </Button>
              </Box>
            </form>
          );
        }}
      </Formik>

      <Snackbar
        open={openSnack}
        autoHideDuration={2200}
        onClose={() => setOpenSnack(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" sx={{ bgcolor: colors.orangeAccent[500] }}>
          Issue submitted successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}
