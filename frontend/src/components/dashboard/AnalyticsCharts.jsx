import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const PURPLE = '#5b3fc7';
const TEXT_MAIN = '#2d2d6b';
const TEXT_MUTED = '#888';
const GREEN = '#22a163';
const RED = '#e53e3e';
const COLORS = [PURPLE, '#8b5cf6', '#ec4899', '#f59e0b', GREEN, RED, '#3b82f6', '#a78bfa'];

export const AnalyticsCharts = ({ adminStats }) => {
  if (!adminStats) return null;

  const statusDistribution = adminStats?.statusDistribution || [];
  const campaignPerformance = adminStats?.campaignPerformance || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
      {/* Lead Status Breakdown Chart */}
      <div style={{ background: '#fff', border: '1px solid #e5e2f5', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: TEXT_MAIN, marginBottom: 16 }}>
          Overall Lead Status Distribution
        </div>
        {statusDistribution.length > 0 ? (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MUTED, fontSize: 13 }}>
            No status data available
          </div>
        )}
      </div>

      {/* Campaign Performance Bar Chart */}
      <div style={{ background: '#fff', border: '1px solid #e5e2f5', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: TEXT_MAIN, marginBottom: 16 }}>
          Campaign Performance Breakdown
        </div>
        {campaignPerformance.length > 0 ? (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignPerformance.slice(0, 6)}>
                <XAxis dataKey="name" stroke={TEXT_MUTED} fontSize={11} tickLine={false} />
                <YAxis stroke={TEXT_MUTED} fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="totalLeads" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Total Leads" />
                <Bar dataKey="won" fill={GREEN} radius={[4, 4, 0, 0]} name="Won Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_MUTED, fontSize: 13 }}>
            No campaign data available
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsCharts;
