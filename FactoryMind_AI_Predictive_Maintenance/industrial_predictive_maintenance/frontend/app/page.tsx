"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Cpu,
  Factory,
  Gauge,
  Layers3,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Machine = {
  id: string;
  name: string;
  type: string;
  site: string;
  temperature_c: number;
  vibration_mm_s: number;
  pressure_bar: number;
  rpm: number;
  voltage_v: number;
  operating_hours: number;
  days_since_service: number;
  load_pct: number;
  failure_probability: number;
  failure_risk: string;
  status: string;
  rul_days: number;
  anomaly_score: number;
  top_factors: { feature: string; score: number; message: string }[];
  recommended_action: string;
};

type Dashboard = {
  kpis: { machines: number; critical: number; warning: number; healthy: number; avg_risk_pct: number; avg_rul_days: number; fleet_availability: number; maintenance_saved_pct: number };
  alerts: Machine[];
  weekly: { label: string; risk: number; availability: number }[];
  sites: { site: string; machines: number; critical: number; warning: number; avg_risk: number }[];
  model: { auc: number; rul_mae_days: number };
};

type Detail = { machine: Machine; trend: { day: string; temperature: number; vibration: number; load: number }[] };

function money(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function pct(n: number) { return `${Math.round(n * 100)}%`; }

function RiskPill({ status }: { status: string }) {
  return <span className={`risk risk-${status.toLowerCase()}`}><span className="dot" />{status}</span>;
}

function MetricCard({ icon: Icon, label, value, foot, tone = "default" }: { icon: any; label: string; value: string | number; foot: string; tone?: string }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-top"><div className="metric-icon"><Icon size={18} /></div><span className="metric-foot">{foot}</span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/dashboard`).then((r) => r.json()),
      fetch(`${API}/api/machines`).then((r) => r.json()),
    ]).then(([d, m]) => { setDashboard(d); setMachines(m); }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => machines.filter((m) => {
    const query = `${m.id} ${m.name} ${m.type} ${m.site}`.toLowerCase();
    const matchesSearch = query.includes(search.toLowerCase());
    const matchesFilter = filter === "All" || m.status === filter;
    return matchesSearch && matchesFilter;
  }), [machines, search, filter]);

  async function openMachine(id: string) {
    const data = await fetch(`${API}/api/machines/${id}`).then((r) => r.json());
    setSelected(data);
  }

  if (loading || !dashboard) return <div className="boot"><div className="boot-mark"><BrainCircuit size={26}/></div><div><strong>FactoryMind AI</strong><span>Loading fleet intelligence…</span></div></div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><BrainCircuit size={20}/></div><div><strong>FactoryMind</strong><span>AI CONTROL CENTER</span></div></div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {[
            ["Overview", Gauge], ["Fleet", Factory], ["Alerts", BellRing], ["Model Lab", BrainCircuit],
          ].map(([name, Icon]: any) => <button key={name} onClick={() => { setTab(name); setMobileOpen(false); }} className={tab === name ? "active" : ""}><Icon size={17}/><span>{name}</span>{name === "Alerts" && <b>{dashboard.kpis.critical + dashboard.kpis.warning}</b>}</button>)}
        </nav>
        <div className="side-label">OPERATIONS</div>
        <nav>
          <button onClick={() => setTab("Maintenance")} className={tab === "Maintenance" ? "active" : ""}><Wrench size={17}/><span>Maintenance Queue</span></button>
          <button onClick={() => setTab("Sensors")} className={tab === "Sensors" ? "active" : ""}><Activity size={17}/><span>Sensor Health</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plant-card"><div className="plant-dot" /><div><strong>North Plant</strong><span>All systems nominal</span></div><ChevronRight size={14}/></div>
          <button className="settings"><Settings2 size={17}/><span>Settings</span></button>
          <div className="profile"><div className="avatar">AI</div><div><strong>Operations AI</strong><span>Predictive team</span></div><div className="status-online" /></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <div className="crumb"><span>Operations</span><ChevronRight size={13}/><strong>{tab}</strong></div>
          <div className="top-actions"><span className="live"><i /> LIVE MODEL</span><button className="icon-btn"><BellRing size={17}/></button><div className="top-avatar">FM</div></div>
        </header>

        {tab === "Overview" && (
          <>
            <section className="hero-row">
              <div><div className="eyebrow">INDUSTRIAL ML • CONDITION-BASED MAINTENANCE</div><h1>Predict failure <em>before</em> downtime.</h1><p>FactoryMind combines live sensor signals, anomaly detection and failure-risk models to turn machine telemetry into maintenance actions.</p></div>
              <div className="model-chip"><div className="chip-icon"><Sparkles size={16}/></div><div><span>MODEL HEALTH</span><strong>AUC {dashboard.model.auc.toFixed(2)}</strong></div><CheckCircle2 size={17}/></div>
            </section>

            <section className="metrics-grid">
              <MetricCard icon={Cpu} label="Fleet monitored" value={dashboard.kpis.machines} foot="+12 this month" />
              <MetricCard icon={AlertTriangle} label="Critical machines" value={dashboard.kpis.critical} foot={`${dashboard.kpis.avg_risk_pct}% avg risk`} tone="critical" />
              <MetricCard icon={CircleGauge} label="Fleet availability" value={`${dashboard.kpis.fleet_availability}%`} foot="+1.8% vs last month" />
              <MetricCard icon={Zap} label="Maintenance saved" value={`${dashboard.kpis.maintenance_saved_pct}%`} foot="estimated from avoided downtime" tone="positive" />
            </section>

            <section className="dashboard-grid top-grid">
              <div className="panel chart-panel">
                <div className="panel-head"><div><div className="panel-kicker">FLEET TREND</div><h2>Risk & availability</h2></div><div className="legend"><span><i className="legend-risk"/>Risk index</span><span><i className="legend-av"/>Availability</span></div></div>
                <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.weekly} margin={{top:10,right:6,left:-24,bottom:0}}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7b57" stopOpacity={0.26}/><stop offset="100%" stopColor="#ff7b57" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1f2833" vertical={false}/><XAxis dataKey="label" tick={{fill:"#6f7d8d",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#6f7d8d",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#10161d",border:"1px solid #26313d",borderRadius:12,color:"#fff"}}/><Area type="monotone" dataKey="risk" stroke="#ff7b57" fill="url(#riskFill)" strokeWidth={2.5}/><Line type="monotone" dataKey="availability" stroke="#68b7a6" strokeWidth={2} dot={false}/></AreaChart></ResponsiveContainer></div>
                <div className="chart-foot"><span><b>{dashboard.kpis.avg_risk_pct}%</b> current average risk</span><span><b>{dashboard.kpis.avg_rul_days} days</b> average remaining life</span></div>
              </div>
              <div className="panel ai-panel">
                <div className="panel-head"><div><div className="panel-kicker">AI COPILOT</div><h2>Maintenance brief</h2></div><div className="ai-status"><i/> Online</div></div>
                <div className="brief-card"><Sparkles size={16}/><div><strong>Today's priority</strong><p>{dashboard.kpis.critical} assets require urgent inspection. The highest-risk cluster is driven by vibration and long service intervals.</p></div></div>
                {dashboard.alerts.slice(0,3).map((m) => <button className="mini-alert" key={m.id} onClick={() => openMachine(m.id)}><div className="mini-left"><RiskPill status={m.status}/><strong>{m.name}</strong></div><div className="mini-right"><span>{pct(m.failure_probability)}</span><ChevronRight size={14}/></div></button>)}
                <button className="ghost-wide" onClick={() => setTab("Alerts")}>Open alert center <ArrowUpRight size={15}/></button>
              </div>
            </section>

            <section className="dashboard-grid lower-grid">
              <div className="panel fleet-panel">
                <div className="panel-head"><div><div className="panel-kicker">FLEET MONITOR</div><h2>Highest-risk machines</h2></div><button className="view-all" onClick={() => setTab("Fleet")}>View fleet <ArrowUpRight size={14}/></button></div>
                <div className="table-wrap"><table><thead><tr><th>Machine</th><th>Location</th><th>Load</th><th>Risk</th><th>RUL</th><th /></tr></thead><tbody>{dashboard.alerts.slice(0,6).map((m) => <tr key={m.id} onClick={() => openMachine(m.id)}><td><div className="machine-cell"><div className="machine-icon"><Factory size={15}/></div><div><strong>{m.name}</strong><span>{m.id} • {m.type}</span></div></div></td><td>{m.site}</td><td><div className="bar"><i style={{width:`${Math.min(m.load_pct,100)}%`}}/></div><span className="bar-value">{m.load_pct}%</span></td><td><RiskPill status={m.status}/></td><td><strong className={m.rul_days < 15 ? "orange" : ""}>{m.rul_days}d</strong></td><td><ChevronRight size={15} className="muted"/></td></tr>)}</tbody></table></div>
              </div>
              <div className="panel sites-panel">
                <div className="panel-head"><div><div className="panel-kicker">SITE HEALTH</div><h2>Plant summary</h2></div></div>
                <div className="site-list">{dashboard.sites.map((s) => <div className="site-row" key={s.site}><div className="site-title"><span className="site-icon"><Factory size={14}/></span><div><strong>{s.site}</strong><small>{s.machines} machines monitored</small></div></div><div className="site-health"><span>{s.avg_risk}% risk</span><div className="stack"><i className="healthy" style={{width:`${Math.max(10,100-s.avg_risk-s.critical*7-s.warning*3)}%`}}/><i className="warning" style={{width:`${s.warning*6}%`}}/><i className="critical" style={{width:`${s.critical*10}%`}}/></div></div></div>)}</div>
                <div className="model-box"><div className="model-icon"><BrainCircuit size={17}/></div><div><strong>Model performance</strong><span>Failure AUC {dashboard.model.auc.toFixed(2)} • RUL MAE {dashboard.model.rul_mae_days.toFixed(1)}d</span></div></div>
              </div>
            </section>
          </>
        )}

        {tab !== "Overview" && <FleetPage tab={tab} machines={filtered} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onOpen={openMachine} dashboard={dashboard}/>} 
      </main>

      {selected && <MachineDrawer detail={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FleetPage({ tab, machines, filter, setFilter, search, setSearch, onOpen, dashboard }: { tab:string; machines:Machine[]; filter:string; setFilter:(v:string)=>void; search:string; setSearch:(v:string)=>void; onOpen:(id:string)=>void; dashboard:Dashboard }) {
  const title = tab === "Fleet" ? "Fleet intelligence" : tab === "Alerts" ? "Alert center" : tab === "Maintenance" ? "Maintenance queue" : tab === "Sensors" ? "Sensor health" : "ML model lab";
  const desc = tab === "Fleet" ? "Inspect every asset and drill into the sensor signals behind its risk score." : tab === "Alerts" ? "Prioritized machine risks generated from the live fleet model." : tab === "Maintenance" ? "Turn predictions into a practical maintenance work queue." : tab === "Sensors" ? "Review condition signals that drive model predictions." : "Understand the predictive models and their decision signals.";
  return <div className="inner-page"><section className="hero-row compact"><div><div className="eyebrow">FACTORYMIND AI</div><h1>{title}</h1><p>{desc}</p></div><div className="page-stat"><span>Average RUL</span><strong>{dashboard.kpis.avg_rul_days} days</strong></div></section>{tab === "Model Lab" ? <ModelLab dashboard={dashboard}/> : <><div className="toolbar"><div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search machines, sites, IDs…"/></div><div className="filters">{["All","Critical","Warning","Healthy"].map(s=><button key={s} onClick={()=>setFilter(s)} className={filter===s?"selected":""}>{s}{s!=="All" && <span>{dashboard.kpis[s.toLowerCase() as "critical"|"warning"|"healthy"]}</span>}</button>)}</div></div><div className="fleet-grid">{machines.slice(0, 30).map(m=><MachineCard key={m.id} machine={m} onOpen={onOpen}/>)}</div></>}</div>;
}

function MachineCard({ machine:m, onOpen }: { machine:Machine; onOpen:(id:string)=>void }) {
  return <button className="machine-card" onClick={()=>onOpen(m.id)}><div className="card-head"><div className="machine-cell"><div className="machine-icon"><Factory size={15}/></div><div><strong>{m.name}</strong><span>{m.id} • {m.site}</span></div></div><RiskPill status={m.status}/></div><div className="signal-grid"><div><span>Temperature</span><strong>{m.temperature_c}°C</strong></div><div><span>Vibration</span><strong>{m.vibration_mm_s} mm/s</strong></div><div><span>Load</span><strong>{m.load_pct}%</strong></div><div><span>RUL</span><strong className={m.rul_days < 15 ? "orange" : ""}>{m.rul_days}d</strong></div></div><div className="risk-progress"><div><span>Failure probability</span><b>{pct(m.failure_probability)}</b></div><div className="progress"><i style={{width:`${m.failure_probability*100}%`}}/></div></div><div className="card-foot"><span><AlertTriangle size={13}/> {m.top_factors[0]?.feature?.replaceAll("_"," ") || "No major driver"}</span><ChevronRight size={15}/></div></button>
}

function ModelLab({ dashboard }: { dashboard:Dashboard }) {
  const factors = [
    ["Vibration", 0.31], ["Temperature", 0.24], ["Service age", 0.18], ["Load", 0.11], ["Pressure", 0.07], ["Operating hours", 0.05], ["Voltage", 0.03], ["RPM", 0.01]
  ];
  return <div className="model-lab"><div className="model-hero"><div className="model-hero-icon"><BrainCircuit size={28}/></div><div><div className="panel-kicker">PREDICTIVE MAINTENANCE MODEL</div><h2>Failure risk + remaining useful life</h2><p>Two complementary models turn eight sensor and operating features into a probability of near-term failure and an estimated remaining service window.</p></div><div className="model-kpi"><span>Validation AUC</span><strong>{dashboard.model.auc.toFixed(2)}</strong><small>Holdout evaluation</small></div></div><div className="lab-grid"><div className="panel"><div className="panel-head"><div><div className="panel-kicker">EXPLAINABILITY</div><h2>Feature influence</h2></div></div>{factors.map(([n,v])=><div className="factor" key={n as string}><div><span>{n as string}</span><b>{Math.round((v as number)*100)}%</b></div><div className="progress"><i style={{width:`${(v as number)*100/0.31*100}%`}}/></div></div>)}</div><div className="panel methodology"><div className="panel-head"><div><div className="panel-kicker">METHOD</div><h2>Model workflow</h2></div></div><div className="step"><span>01</span><div><strong>Signal validation</strong><p>Check ranges, missing telemetry and operating-state consistency.</p></div></div><div className="step"><span>02</span><div><strong>Failure classification</strong><p>Gradient-boosted classifier estimates near-term failure probability.</p></div></div><div className="step"><span>03</span><div><strong>RUL regression</strong><p>Random forest estimates remaining service time in days.</p></div></div><div className="step"><span>04</span><div><strong>Action routing</strong><p>Risk level maps to a recommended maintenance window.</p></div></div></div></div></div>;
}

function MachineDrawer({ detail, onClose }: { detail:Detail; onClose:()=>void }) {
  const m = detail.machine;
  return <><div className="drawer-backdrop" onClick={onClose}/><aside className="drawer"><div className="drawer-head"><div><div className="panel-kicker">MACHINE DETAIL</div><h2>{m.name}</h2><span>{m.id} • {m.type} • {m.site}</span></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="drawer-risk"><div><span>Failure probability</span><strong>{pct(m.failure_probability)}</strong></div><RiskPill status={m.status}/></div><div className="drawer-kpis"><div><span>RUL</span><strong>{m.rul_days} days</strong></div><div><span>Load</span><strong>{m.load_pct}%</strong></div><div><span>Anomaly</span><strong>{Math.round(m.anomaly_score*100)}%</strong></div></div><div className="drawer-chart"><div className="section-title"><span>Sensor trend</span><small>Last 15 snapshots</small></div><ResponsiveContainer width="100%" height={230}><LineChart data={detail.trend} margin={{top:10,right:10,left:-28,bottom:0}}><CartesianGrid stroke="#202a35" vertical={false}/><XAxis dataKey="day" hide/><YAxis tick={{fill:"#718090",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#10161d",border:"1px solid #26313d",borderRadius:12}}/><Line type="monotone" dataKey="temperature" stroke="#ff875f" strokeWidth={2.4} dot={false}/><Line type="monotone" dataKey="vibration" stroke="#7e8cff" strokeWidth={2.2} dot={false}/></LineChart></ResponsiveContainer><div className="chart-key"><span><i className="temp-dot"/>Temperature</span><span><i className="vib-dot"/>Vibration</span></div></div><div className="factor-list"><div className="section-title"><span>Why the model is concerned</span><small>Top drivers</small></div>{m.top_factors.map((f)=><div className="factor-item" key={f.feature}><div className="factor-bullet"><AlertTriangle size={13}/></div><div><strong>{f.message}</strong><span>{f.feature.replaceAll("_", " ")} • signal contribution {Math.round(f.score*100)}%</span></div></div>)}</div><div className="action-card"><div className="action-icon"><Wrench size={16}/></div><div><span>RECOMMENDED ACTION</span><strong>{m.recommended_action}</strong></div></div><button className="primary-wide"><Wrench size={16}/> Create maintenance work order</button></aside></>;
}
