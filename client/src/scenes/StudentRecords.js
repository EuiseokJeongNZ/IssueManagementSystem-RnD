import { Box, useTheme } from "@mui/material";
import Header from "../components/Header";
import PieChart from "../components/PieChart";
import { tokens } from "../theme";

const StudentRecords = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box m="20px">
      <Header
        title={
          <span style={{ color: colors.primary[100], fontWeight: "bold" }}>
            ISSUES REPORT
          </span>
        }
        // subtitle={
        //   <span style={{ color: colors.primary[100] }}>
        //     Pie Chart
        //   </span>
        // }
      />
      <Box height="75vh">
        <PieChart />
      </Box>
    </Box>
  );
};

export default StudentRecords;
