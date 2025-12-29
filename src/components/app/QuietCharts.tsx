"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface QuietBarChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  selectedIndex?: number;
}

export function QuietBarChart({ data, height = 300, selectedIndex }: QuietBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #E6DDD3",
            borderRadius: "12px",
            padding: "8px 12px",
            color: "#121212",
            fontSize: "13px",
          }}
          labelStyle={{ color: "#6B6B6B", fontSize: "12px", marginBottom: "4px" }}
        />
        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={selectedIndex === index ? "#D65A4A" : entry.color}
              opacity={selectedIndex === index ? 1 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface QuietPieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  selectedIndex?: number;
}

export function QuietPieChart({ data, height = 300, selectedIndex }: QuietPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => {
            if (!percent || percent < 0.05) return ""; // Hide labels for small slices
            return `${name}: ${(percent * 100).toFixed(0)}%`;
          }}
          outerRadius={height * 0.35}
          fill="#8884d8"
          dataKey="value"
          stroke="white"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={selectedIndex === index ? "#D65A4A" : entry.color}
              opacity={selectedIndex === index ? 1 : 0.7}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #E6DDD3",
            borderRadius: "12px",
            padding: "8px 12px",
            color: "#121212",
            fontSize: "13px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

