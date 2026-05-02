import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Static demo data — replace with useScans aggregate in production
const co2Data = [
  { week: 'W1', saved: 210, baseline: 180 },
  { week: 'W2', saved: 285, baseline: 180 },
  { week: 'W3', saved: 320, baseline: 180 },
  { week: 'W4', saved: 410, baseline: 180 },
  { week: 'W5', saved: 388, baseline: 180 },
  { week: 'W6', saved: 447, baseline: 180 },
  { week: 'W7', saved: 520, baseline: 180 },
];

const firewoodData = [
  { week: 'W1', bundles: 14 },
  { week: 'W2', bundles: 19 },
  { week: 'W3', bundles: 21 },
  { week: 'W4', bundles: 27 },
  { week: 'W5', bundles: 26 },
  { week: 'W6', bundles: 30 },
  { week: 'W7', bundles: 35 },
];

const tooltipStyle = {
  backgroundColor: '#1a1d27',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  fontSize: 11,
  color: '#e8eaf0',
};

const axisStyle = { fill: '#8b8fa8', fontSize: 10 };

export default function ClimateAnalytics({ isAdmin }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* CO2 avoided bar chart */}
      <div className={`card relative overflow-hidden ${!isAdmin ? 'min-h-[260px]' : ''}`}>
        <div className="card-header">
          <span className="w-2 h-2 rounded-sm bg-vault-green" />
          Firewood avoidance — CO₂ saved (kg/week)
        </div>
        <div className={`card-body pt-2 ${!isAdmin ? 'blur-md grayscale opacity-30 select-none pointer-events-none' : ''}`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={co2Data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#8b8fa8', paddingTop: 8 }}
              />
              <Bar dataKey="saved"    name="CO₂ avoided (kg)" fill="#10d97e" radius={[3,3,0,0]} />
              <Bar dataKey="baseline" name="Baseline"          fill="#f4a134" radius={[3,3,0,0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!isAdmin && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-vault-bg/20 z-10 p-6 text-center">
            <Lock className="text-vault-amber mb-2" size={24} />
            <div className="text-sm font-bold text-vault-text">CO₂ Analytics Restricted</div>
            <div className="text-[11px] text-vault-muted mt-1">Administrator verification required</div>
          </div>
        )}
      </div>

      {/* Firewood bundles saved line chart */}
      <div className="card">
        <div className="card-header">
          <span className="w-2 h-2 rounded-sm bg-vault-amber" />
          Wood bundles saved (units/week)
        </div>
        <div className="card-body pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={firewoodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8b8fa8', paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="bundles"
                name="Bundles saved"
                stroke="#f4a134"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f4a134' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Total bundles', value: '172' },
              { label: 'Avg CO₂/bundle', value: isAdmin ? '3.02 kg' : '••••' },
              { label: 'Week-on-week', value: '+16.7%' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-vault-surface2 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-vault-muted">{label}</div>
                <div className="text-sm font-semibold text-vault-amber mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Site impact table */}
      <div className="card lg:col-span-2">
        <div className="card-header">Site-level impact summary</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Site','Participants','Scans (wk)','CO₂ saved','Avg nutrition','Payout'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-vault-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { site: 'Berekuso Farm A', p: 7, scans: 49, co2: '842 kg', nutr: 76.4, status: 'Paid', sc: 'badge-green' },
                { site: 'Berekuso Farm B', p: 6, scans: 38, co2: '684 kg', nutr: 71.8, status: 'Paid', sc: 'badge-green' },
                { site: 'Tomato Co-op West', p: 5, scans: 31, co2: '510 kg', nutr: 73.2, status: 'Pending', sc: 'badge-amber' },
              ].map((r) => (
                <tr key={r.site} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-medium text-vault-text">{r.site}</td>
                  <td className="px-4 py-2.5 text-vault-muted">{r.p}</td>
                  <td className="px-4 py-2.5 text-vault-muted">{r.scans}</td>
                  <td className="px-4 py-2.5 text-vault-green font-medium">
                    {isAdmin ? r.co2 : <span className="blur-[3px] select-none">888 kg</span>}
                  </td>
                  <td className="px-4 py-2.5 text-vault-blue">{r.nutr}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <span className={`badge ${r.sc}`}>{r.status}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-vault-muted">
                        <Lock size={10} /> Locked
                      </span>
                    )}
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
