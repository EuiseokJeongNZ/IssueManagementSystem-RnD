import { ResponsivePie } from "@nivo/pie";
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const PieChart = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${API}/issues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });

        const issues = Array.isArray(res.data)
          ? res.data
          : res.data.items || [];

        // ✅ 상태별 개수 계산
        const counts = {
          open: 0,
          in_progress: 0,
          resolved: 0,
        };

        issues.forEach((i) => {
          if (i.status === "open") counts.open++;
          else if (i.status === "in_progress") counts.in_progress++;
          else if (i.status === "resolved") counts.resolved++;
        });

        // ✅ Nivo PieChart용 데이터 변환
        setChartData([
          {
            id: "Open",
            label: "Open",
            value: counts.open,
            color: "#E6C39F",
          },
          {
            id: "In Progress",
            label: "In Progress",
            value: counts.in_progress,
            color: "#E07A5F",
          },
          {
            id: "Resolved",
            label: "Resolved",
            value: counts.resolved,
            color: "#E9DF74",
          },
        ]);
      } catch (e) {
        console.error("PieChart 데이터 로드 실패:", e);
      }
    })();
  }, []);

  return (
    <ResponsivePie
      data={chartData}
      theme={{
        legends: {
          text: { fill: colors.gray[100] },
        },
      }}
      margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
      innerRadius={0.55}
      padAngle={1}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      borderWidth={1}
      borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor={colors.gray[100]}
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: "color" }}
      enableArcLabels={false}
      colors={{ datum: "data.color" }} // ✅ 직접 지정한 색상 사용
      legends={[
        {
          anchor: "bottom",
          direction: "row",
          justify: false,
          translateX: 0,
          translateY: 56,
          itemsSpacing: 0,
          itemWidth: 120,
          itemHeight: 18,
          itemTextColor: "#999",
          itemDirection: "left-to-right",
          itemOpacity: 1,
          symbolSize: 18,
          symbolShape: "circle",
          effects: [
            {
              on: "hover",
              style: { itemTextColor: "#000" },
            },
          ],
        },
      ]}
    />
  );
};

export default PieChart;
