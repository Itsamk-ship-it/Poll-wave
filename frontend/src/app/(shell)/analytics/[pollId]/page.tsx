'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Eye, ListChecks, ShieldAlert, Vote } from 'lucide-react';
import { analyticsApi, pollsApi } from '@/lib/services';
import type { PollResults } from '@/lib/types';
import { CHART_COLORS } from '@/lib/utils';
import { RequireAuth } from '@/components/common/require-auth';
import { StatCard } from '@/components/common/stat-card';
import { EmptyState } from '@/components/common/empty-state';
import { PageLoading } from '@/components/common/loading';
import { ResultsCharts } from '@/components/poll/results-charts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: '12px',
  color: 'hsl(var(--popover-foreground))',
};

const axisTick = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' };

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function AnalyticsInner() {
  const params = useParams();
  const pollId = String(params.pollId);

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analytics', pollId],
    queryFn: () => analyticsApi.poll(pollId),
    retry: false,
  });

  const { data: poll } = useQuery({
    queryKey: ['poll', pollId],
    queryFn: () => pollsApi.get(pollId),
    retry: false,
  });

  if (isLoading) return <PageLoading label="Crunching the numbers…" />;

  const status = (error as AxiosError | null)?.response?.status;
  if (status === 403) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <EmptyState
          icon={<ShieldAlert />}
          title="Not authorized"
          description="Only the poll's author can view its analytics."
        />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <EmptyState
          icon={<BarChart3 />}
          title="Analytics unavailable"
          description="We couldn't load analytics for this poll."
        />
      </div>
    );
  }

  const deviceData = Object.entries(analytics.deviceBreakdown).map(([name, value]) => ({
    name,
    value,
  }));
  const browserData = Object.entries(analytics.browserBreakdown).map(
    ([name, value]) => ({ name, value }),
  );

  const results: PollResults = {
    pollId,
    totalVotes: analytics.totalVotes,
    options: analytics.options,
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Analytics</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {poll?.title ?? 'Poll analytics'}
        </h1>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Views"
          value={analytics.totalViews.toLocaleString()}
          icon={<Eye />}
        />
        <StatCard
          label="Total Votes"
          value={analytics.totalVotes.toLocaleString()}
          icon={<Vote />}
        />
        <StatCard
          label="Conversion Rate"
          value={`${analytics.conversionRate}%`}
          icon={<BarChart3 />}
          hint="Votes per view"
        />
        <StatCard
          label="Options"
          value={analytics.options.length}
          icon={<ListChecks />}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Voting Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={analytics.dailyActivity}
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <defs>
                    <linearGradient id="votesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="votes"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2.5}
                    fill="url(#votesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No voting activity yet" />
            )}
          </CardContent>
        </Card>

        {/* Top voting times */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Voting Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topVotingTimes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={analytics.topVotingTimes}
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="hour"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(h) => `${h}:00`}
                  />
                  <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    labelFormatter={(h) => `${h}:00`}
                  />
                  <Bar dataKey="votes" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="Not enough data yet" />
            )}
          </CardContent>
        </Card>

        {/* Device breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Device Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No device data yet" />
            )}
          </CardContent>
        </Card>

        {/* Browser breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Browser Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {browserData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={browserData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type="number"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {browserData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No browser data yet" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Option results */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Option Results</h2>
        <ResultsCharts results={results} />
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsInner />
    </RequireAuth>
  );
}
