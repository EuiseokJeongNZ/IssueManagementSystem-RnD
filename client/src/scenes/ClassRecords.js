import { Box, useTheme } from "@mui/material";
import Header from "../components/Header";
import LineChart from "../components/LineChart";

import { tokens } from "../theme";

const ClassRecords = () => {
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
        //     Line Chart
        //   </span>
        // }
      />
      <Box height="75vh">
        <LineChart />
      </Box>
    </Box>
  );
};

export default ClassRecords;