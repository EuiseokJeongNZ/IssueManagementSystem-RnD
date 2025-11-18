import { Box, useTheme } from "@mui/material";
import Header from "../components/Header";
import BarChart from "../components/BarChart";
import { tokens } from "../theme";

const ClassProgress = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header 
        title="Class Progress"
        subtitle={
          <span style={{ color: colors.primary[100] }}>
            Simple Class data
          </span>
        }
      />
      <Box height="75vh">
        <BarChart />
      </Box>
    </Box>
  );
};

export default ClassProgress;

