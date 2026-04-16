import { useState } from 'react';
import { Download, Filter, BookOpen } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useNutrition, useNutritionAggregate } from '../hooks/useData';
import api from '../utils/api';

const DEMO_ROWS = [
  { id: '1', log_date: '2026-04-15', participant_name: 'Akosua Mensah', site_name: 'Farm A', cooperative: 'Berekuso Coop', meal_description: 'Bean stew with greens', protein_g: 28, kcal: 480, nutrition_score: 82, researcher_verified: true },
  { id: '2', log_date: '2026-04-15', participant_name: 'Abena Owusu', site_name: 'Farm B', cooperative: 'Berekuso Coop', meal_description: 'Kontomire with yam', protein_g: 22, kcal: 410, nutrition_score: 74, researcher_verified: true },
  { id: '3', log_date: '2026-04-14', participant_name: 'Akosua Mensah', site_name: 'Farm A', cooperative: 'Berekuso Coop', meal_description: 'Groundnut soup with rice', protein_g: 31, kcal: 520, nutrition_score: 86, researcher_verified: true },
  { id: '4', log_date: '2026-04-14', participant_name: 'Ama Asante', site_name: 'Farm A', cooperative: 'Berekuso Coop', meal_description: 'Egg with tomato sauce', protein_g: 18, kcal: 360, nutrition_score: 68, researcher_verified: false },
  { id: '5', log_date: '2026-04-13', participant_name: 'Abena Owusu', site_name: 'Farm B', cooperative: 'Berekuso Coop', meal_description: 'Bean stew', protein_g: 25, kcal: 440, nutrition_score: 78, researcher_verified: true },
];

const DEMO_CHART = [
  { week_start: 'W1', avg_score: 62, avg_protein_g: 18 },
  { week_start: 'W2', avg_score: 65, avg_protein_g: 20 },
  { week_start: 'W3', avg_score: 70, avg_protein_g: 22 },
  { week_start: 'W4', avg_score: 71, avg_protein_g: 23 },
  { week_start: 'W5', avg_score: 74, avg_protein_g: 25 },
  { week_start: 'W6', avg_score: 76, avg_protein_g: 26 },
  { week_start: 'W7', avg_score: 78, avg_protein_g: 28 },
];

const tooltipStyle = {
  backgroundColor: '#1a1d27',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 11,
  color: '#e8eaf0',
};
const axisStyle = { fill: '#8b8fa8', fontSize: 10 };

function ScoreChip({ score }) {
  const color = score >= 80 ? 'text-vault-green' : score >= 70 ? 'text-vault-blue' : 'text-vault-amber';
  return <span className={`text-xs font-bold ${color}`}>{score ?? '—'}</span>;
}

export default function ProvostPortal() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const params = {};
  if (dateFrom) params.from = dateFrom;
  if (dateTo)   params.to   = dateTo;

  const { data: nutData, loading }   = useNutrition(params);
  const { data: aggData }            = useNutritionAggregate();

  const rows      = nutData?.data?.length ? nutData.data : DEMO_ROWS;
  const chartData = aggData?.data?.length ? aggData.data : DEMO_CHART;

  const handleCsvExport = () => {
    try {
      api.getNutritionCsv(params);
    } catch {
      // Fallback: client-side CSV if API unavailable
      const headers = ['date','participant','site','cooperative','meal','protein_g','kcal','score','verified'];
      const csvRows = rows.map(r => [
        r.log_date, r.participant_name, r.site_name, r.cooperative,
        `"${(r.meal_description || '').replace(/"/g, '""')}"`,
        r.protein_g, r.kcal, r.nutrition_score, r.researcher_verified,
      ].join(','));
      const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'carbon_clarity_nutrition.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-vault-blue" />
          <span className="text-sm font-medium text-vault-text">Provost Research Hub</span>
          <span className="badge badge-blue">Academic access</span>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-vault-muted" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-vault-surface2 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-vault-text"
          />
          <span className="text-vault-muted text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-vault-surface2 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-vault-text"
          />
          <button onClick={handleCsvExport} className="btn btn-green">
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* API endpoint reference */}
      <div className="card">
        <div className="card-header">REST API endpoint — academic export</div>
        <div className="card-body">
          <code className="block bg-vault-surface2 rounded-lg p-3 text-[11px] text-vault-text font-mono leading-relaxed">
            <span className="text-vault-blue">GET</span> /api/v1/nutrition<br />
            &nbsp;&nbsp;?site=berekuso-farm-a<br />
            &nbsp;&nbsp;&amp;from=2026-04-01<br />
            &nbsp;&nbsp;&amp;to=2026-04-15<br />
            &nbsp;&nbsp;&amp;format=csv &nbsp;<span className="text-vault-muted">{'/* or json */'}</span><br />
            &nbsp;&nbsp;Authorization: Bearer {'<provost-api-key>'}
          </code>
        </div>
      </div>

      {/* Nutrition trend chart */}
      <div className="card">
        <div className="card-header">
          <span className="w-2 h-2 rounded-sm bg-vault-blue" />
          Nutrition score trend (weekly average)
        </div>
        <div className="card-body pt-2">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week_start" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={80} stroke="#9d7dff" strokeDasharray="4 4" label={{ value: 'Target 80', fill: '#9d7dff', fontSize: 10 }} />
              <Line type="monotone" dataKey="avg_score"     name="Nutrition score" stroke="#4d9fff" strokeWidth={2} dot={{ r: 3, fill: '#4d9fff' }} />
              <Line type="monotone" dataKey="avg_protein_g" name="Protein (g)"     stroke="#10d97e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="card">
        <div className="card-header">
          Food &amp; nutrition log
          <span className="ml-auto text-[10px] text-vault-muted">{rows.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Date','Participant','Site','Meal','Protein (g)','Kcal','Score','Verified'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-vault-muted font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-vault-muted">Loading…</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-vault-muted whitespace-nowrap">{r.log_date}</td>
                  <td className="px-4 py-2.5 font-medium text-vault-text">{r.participant_name}</td>
                  <td className="px-4 py-2.5 text-vault-muted">{r.site_name}</td>
                  <td className="px-4 py-2.5 text-vault-text max-w-[160px] truncate">{r.meal_description}</td>
                  <td className="px-4 py-2.5 text-vault-text">{r.protein_g}</td>
                  <td className="px-4 py-2.5 text-vault-text">{r.kcal}</td>
                  <td className="px-4 py-2.5"><ScoreChip score={r.nutrition_score} /></td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${r.researcher_verified ? 'badge-green' : 'badge-amber'}`}>
                      {r.researcher_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
