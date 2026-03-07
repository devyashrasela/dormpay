import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../api/axios';
import { formatAlgo } from '../utils/formatters';

export default function Analytics() {
    const [summary, setSummary] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([fetchSummary(), fetchMonthly()]).finally(() => setLoading(false));
    }, []);

    const fetchSummary = async () => {
        try {
            const res = await api.get('/api/analytics/summary');
            setSummary(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchMonthly = async () => {
        try {
            const res = await api.get('/api/analytics/monthly?months=6');
            setMonthly(res.data);
        } catch (err) { console.error(err); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>;

    // Merge sent/received monthly data
    const allMonths = new Set([
        ...(monthly?.sent || []).map((r) => r.month),
        ...(monthly?.received || []).map((r) => r.month),
    ]);
    const chartData = Array.from(allMonths).sort().map((month) => ({
        month: month.slice(5), // "03" from "2026-03"
        sent: monthly?.sent?.find((r) => r.month === month)?.total || 0,
        received: monthly?.received?.find((r) => r.month === month)?.total || 0,
    }));

    return (
        <div>
            <div className="section-label">— The Numbers</div>

            {/* Summary Stats */}
            <div className="stat-strip" style={{ marginBottom: 32 }}>
                <div className="stat-cell">
                    <div className="stat-cell-label">Total Sent</div>
                    <div className="stat-cell-value">
                        {formatAlgo(summary?.sent?.total || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>ALGO</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {summary?.sent?.count || 0} transactions
                    </div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Total Received</div>
                    <div className="stat-cell-value">
                        {formatAlgo(summary?.received?.total || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>ALGO</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {summary?.received?.count || 0} transactions
                    </div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Net Flow</div>
                    <div className="stat-cell-value" style={{ color: (summary?.net || 0) >= 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {(summary?.net || 0) >= 0 ? '+' : ''}{formatAlgo(summary?.net || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>ALGO</span>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="analytics-grid">
                <div className="chart-card">
                    <div className="chart-title">Monthly Volume</div>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,70,80,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: '#8a8a7a', fontFamily: 'Space Mono' }}
                                    axisLine={{ stroke: 'rgba(11,70,80,0.2)' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#8a8a7a', fontFamily: 'Space Mono' }}
                                    axisLine={{ stroke: 'rgba(11,70,80,0.2)' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: '#F5F2EA',
                                        border: '1px solid #0B4650',
                                        fontFamily: 'Space Mono',
                                        fontSize: 11,
                                    }}
                                />
                                <Bar dataKey="sent" fill="#0B4650" name="Sent" />
                                <Bar dataKey="received" fill="#E6FF2B" stroke="#0B4650" strokeWidth={1} name="Received" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 12, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                            No data yet
                        </div>
                    )}
                </div>

                <div className="chart-card">
                    <div className="chart-title">Net Flow Trend</div>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData.map((d) => ({ ...d, net: d.received - d.sent }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,70,80,0.1)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 10, fill: '#8a8a7a', fontFamily: 'Space Mono' }}
                                    axisLine={{ stroke: 'rgba(11,70,80,0.2)' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#8a8a7a', fontFamily: 'Space Mono' }}
                                    axisLine={{ stroke: 'rgba(11,70,80,0.2)' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: '#F5F2EA',
                                        border: '1px solid #0B4650',
                                        fontFamily: 'Space Mono',
                                        fontSize: 11,
                                    }}
                                />
                                <Line type="monotone" dataKey="net" stroke="#0B4650" strokeWidth={2} dot={{ fill: '#E6FF2B', stroke: '#0B4650', r: 4 }} name="Net" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', fontSize: 12, fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                            No data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Averages */}
            <div className="stat-strip">
                <div className="stat-cell">
                    <div className="stat-cell-label">Avg Sent</div>
                    <div className="stat-cell-value">{formatAlgo(summary?.sent?.avg || 0)}</div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Avg Received</div>
                    <div className="stat-cell-value">{formatAlgo(summary?.received?.avg || 0)}</div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Total Txns</div>
                    <div className="stat-cell-value">{(summary?.sent?.count || 0) + (summary?.received?.count || 0)}</div>
                </div>
            </div>
        </div>
    );
}
