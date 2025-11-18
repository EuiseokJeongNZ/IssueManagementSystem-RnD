import { ResponsiveLine } from "@nivo/line";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LineChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [chartData, setChartData] = useState([]);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentMonthIndex = new Date().getMonth();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${API}/issues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });

        const issues = Array.isArray(res.data) ? res.data : res.data.items || [];

        const countsByMonth = {};
        for (let i = 0; i <= currentMonthIndex; i++) {
          countsByMonth[i] = { open: 0, in_progress: 0, resolved: 0 };
        }

        issues.forEach((issue) => {
          if (!issue.created_at) return;
          const m = new Date(issue.created_at).getMonth();
          if (m <= currentMonthIndex) {
            if (issue.status === "open") countsByMonth[m].open++;
            else if (issue.status === "in_progress") countsByMonth[m].in_progress++;
            else if (issue.status === "resolved") countsByMonth[m].resolved++;
          }
        });

        const monthsToShow = monthNames.slice(0, currentMonthIndex + 1);
        const data = [
          {
            id: "Open",
            color: "#E6C39F",
            data: monthsToShow.map((m, i) => ({ x: m, y: countsByMonth[i]?.open || 0 })),
          },
          {
            id: "In Progress",
            color: "#E07A5F",
            data: monthsToShow.map((m, i) => ({ x: m, y: countsByMonth[i]?.in_progress || 0 })),
          },
          {
            id: "Resolved",
            color: "#E9DF74",
            data: monthsToShow.map((m, i) => ({ x: m, y: countsByMonth[i]?.resolved || 0 })),
          },
        ];

        setChartData(data);
      } catch (e) {
        console.error("📉 LineChart 데이터 로드 실패:", e);
      }
    })();
  }, [currentMonthIndex]);

  // y축 최대값 계산 (정수 tick 만들기 위함)
  const maxY = useMemo(() => {
    let max = 0;
    chartData.forEach(series => {
      series.data.forEach(pt => { if (pt.y > max) max = pt.y; });
    });
    return max;
  }, [chartData]);

  // 정수 tick 목록 생성 (max가 작으면 1단위, 크면 깔끔한 step)
  const intTicks = useMemo(() => {
    if (maxY <= 10) {
      return Array.from({ length: maxY + 1 }, (_, i) => i);
    }
    const step = Math.max(1, Math.ceil(maxY / 10));
    const last = Math.ceil(maxY / step) * step;
    return Array.from({ length: Math.floor(last / step) + 1 }, (_, i) => i * step);
    // 예: maxY=47 → step=5 → [0,5,10,...,50]
  }, [maxY]);

  return (
    <ResponsiveLine
      data={chartData}
      theme={{
        axis: {
          domain: { line: { stroke: colors.gray[100] } },
          legend: { text: { fill: colors.gray[100] } },
          ticks: {
            line: { stroke: colors.gray[100], strokeWidth: 1 },
            text: { fill: colors.gray[100] },
          },
        },
        legends: { text: { fill: colors.gray[100] } },
        tooltip: { container: { color: colors.primary[500] } },
      }}
      colors={{ datum: "color" }}
      margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
      xScale={{ type: "point" }}
      yScale={{
        type: "linear",
        min: 0,            // 0부터 시작
        max: "auto",
        stacked: false,
        reverse: false,
      }}
      yFormat=">-.0f"      // ✅ 모든 값 정수로 표시 (툴팁/내부 포맷)
      curve="catmullRom"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        orient: "bottom",
        tickSize: 0,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Month",
        legendOffset: 36,
        legendPosition: "middle",
      }}
      axisLeft={{
        orient: "left",
        tickValues: intTicks,  // ✅ 정수 tick
        tickSize: 3,
        tickPadding: 5,
        tickRotation: 0,
        legend: isDashboard ? undefined : "Issue Count",
        legendOffset: -40,
        legendPosition: "middle",
      }}
      enableGridX={false}
      enableGridY={false}
      pointSize={8}
      pointColor={{ theme: "background" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      useMesh={true}
      legends={[
        {
          anchor: "bottom-right",
          direction: "column",
          translateX: 100,
          itemWidth: 100,
          itemHeight: 20,
          symbolSize: 12,
          symbolShape: "circle",
          symbolBorderColor: "rgba(0, 0, 0, .5)",
          effects: [
            { on: "hover", style: { itemBackground: "rgba(0, 0, 0, .05)", itemOpacity: 1 } },
          ],
        },
      ]}
    />
  );
};

export default LineChart;
