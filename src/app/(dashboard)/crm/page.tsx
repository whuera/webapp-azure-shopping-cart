"use client";
import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import GlassCard from "@/components/ui/GlassCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import Badge, { statusVariant } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { crmApi } from "@/lib/api";
import {
  CrmCompany, CrmContact, CrmOpportunity, CrmPipelineStage,
  CrmTicket, CrmActivity,
} from "@/types";
import {
  Building2, UserRound, TrendingUp, Ticket,
  Plus, RefreshCw, Trophy, XCircle, CheckCircle, Activity,
} from "lucide-react";

type Tab = "pipeline" | "contacts" | "companies" | "tickets" | "activities";

export default function CrmPage() {
  const [tab, setTab] = useState<Tab>("pipeline");
  const [stages, setStages] = useState<CrmPipelineStage[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [tickets, setTickets] = useState<CrmTicket[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [companyModal, setCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState<Partial<CrmCompany>>({ name: "", industry: "", phone: "", website: "" });
  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<CrmContact>>({ firstName: "", lastName: "", email: "", phone: "", position: "" });
  const [oppModal, setOppModal] = useState(false);
  const [oppForm, setOppForm] = useState<Partial<CrmOpportunity>>({ title: "", amount: 0, probability: 50, status: "OPEN" });
  const [ticketModal, setTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState<Partial<CrmTicket>>({ subject: "", description: "", priority: "MEDIUM", category: "GENERAL" });
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      crmApi.stages.list().then(r => { if (r.success) setStages(r.data); }),
      crmApi.opportunities.list().then(r => { if (r.success) setOpportunities(r.data); }),
      crmApi.contacts.list().then(r => { if (r.success) setContacts(r.data); }),
      crmApi.companies.list().then(r => { if (r.success) setCompanies(r.data); }),
      crmApi.tickets.list().then(r => { if (r.success) setTickets(r.data); }),
    ]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const oppByStage = (stageId: number) =>
    opportunities.filter(o => o.stage?.id === stageId && o.status === "OPEN");

  const totalPipeline = opportunities
    .filter(o => o.status === "OPEN")
    .reduce((s, o) => s + o.amount, 0);

  const wonOpps = opportunities.filter(o => o.status === "WON");
  const openTickets = tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  const moveToStage = async (oppId: number, stageId: number) => {
    await crmApi.opportunities.moveStage(oppId, stageId);
    crmApi.opportunities.list().then(r => { if (r.success) setOpportunities(r.data); });
  };

  const markWon = async (id: number) => {
    await crmApi.opportunities.markWon(id);
    crmApi.opportunities.list().then(r => { if (r.success) setOpportunities(r.data); });
  };

  const markLost = async (id: number) => {
    const reason = prompt("Motivo de pérdida:");
    await crmApi.opportunities.markLost(id, reason ?? undefined);
    crmApi.opportunities.list().then(r => { if (r.success) setOpportunities(r.data); });
  };

  const contactCols: Column<CrmContact>[] = [
    { key: "name", label: "Contacto", render: c => (
      <div>
        <p className="text-white font-medium">{c.firstName} {c.lastName}</p>
        <p className="text-slate-500 text-xs">{c.email ?? "—"}</p>
      </div>
    )},
    { key: "position", label: "Cargo", render: c => <span className="text-slate-300">{c.position ?? "—"}</span> },
    { key: "company", label: "Empresa", render: c => <span className="text-slate-400">{c.company?.name ?? "—"}</span> },
    { key: "status", label: "Estado", render: c => <Badge label={c.status ?? "PROSPECT"} variant={statusVariant(c.status ?? "")} /> },
    { key: "phone", label: "Teléfono", render: c => <span className="text-slate-400 text-xs">{c.phone ?? "—"}</span> },
  ];

  const companyCols: Column<CrmCompany>[] = [
    { key: "name", label: "Empresa", render: c => <span className="text-white font-medium">{c.name}</span> },
    { key: "industry", label: "Industria", render: c => <span className="text-slate-300">{c.industry ?? "—"}</span> },
    { key: "status", label: "Estado", render: c => <Badge label={c.status ?? "PROSPECT"} variant={statusVariant(c.status ?? "")} /> },
    { key: "phone", label: "Teléfono", render: c => <span className="text-slate-400">{c.phone ?? "—"}</span> },
    { key: "employeeCount", label: "Empleados", render: c => <span className="text-slate-400">{c.employeeCount ?? "—"}</span> },
  ];

  const ticketCols: Column<CrmTicket>[] = [
    { key: "ticketNumber", label: "#", render: t => <span className="font-mono text-blue-400">{t.ticketNumber}</span> },
    { key: "subject", label: "Asunto", render: t => <span className="text-white">{t.subject}</span> },
    { key: "category", label: "Categoría", render: t => <Badge label={t.category ?? "—"} variant="default" /> },
    { key: "priority", label: "Prioridad", render: t => (
      <Badge
        label={t.priority}
        variant={t.priority === "URGENT" ? "danger" : t.priority === "HIGH" ? "warning" : "info"}
      />
    )},
    { key: "status", label: "Estado", render: t => <Badge label={t.status} variant={statusVariant(t.status)} /> },
    { key: "actions", label: "", render: t => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
          <>
            <button onClick={() => crmApi.tickets.resolve(t.id).then(loadAll)} className="btn-secondary px-2 py-1 text-xs">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            </button>
            <button onClick={() => crmApi.tickets.close(t.id).then(loadAll)} className="btn-secondary px-2 py-1 text-xs">
              <XCircle className="w-3 h-3 text-red-400" />
            </button>
          </>
        )}
      </div>
    )},
  ];

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "pipeline", label: "Pipeline", icon: TrendingUp },
    { key: "contacts", label: "Contactos", icon: UserRound },
    { key: "companies", label: "Empresas", icon: Building2 },
    { key: "tickets", label: "Tickets", icon: Ticket },
    { key: "activities", label: "Actividades", icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="CRM" subtitle="Gestión de clientes y oportunidades" />
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pipeline total" value={`$${totalPipeline.toLocaleString("es", { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="blue" />
          <StatCard title="Oportunidades" value={opportunities.filter(o => o.status === "OPEN").length} icon={Activity} color="purple" />
          <StatCard title="Ganadas" value={wonOpps.length} icon={Trophy} color="emerald" />
          <StatCard title="Tickets abiertos" value={openTickets} icon={Ticket} color="amber" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-blue-600/30 text-blue-300 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {/* Pipeline Kanban */}
          {tab === "pipeline" && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setOppModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nueva oportunidad
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stages.map(stage => {
                  const opps = oppByStage(stage.id);
                  return (
                    <div key={stage.id} className="shrink-0 w-64 flex flex-col gap-2">
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div>
                          <p className="text-sm font-semibold text-white">{stage.name}</p>
                          <p className="text-xs text-slate-500">{opps.length} opp.</p>
                        </div>
                        <span className="text-xs font-bold text-blue-400">{stage.defaultProbability}%</span>
                      </div>
                      <div className="space-y-2">
                        {opps.map(opp => (
                          <div key={opp.id} className="glass p-3 cursor-pointer hover:bg-white/10 transition-all">
                            <p className="text-sm font-medium text-white truncate">{opp.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{opp.contact?.firstName} {opp.contact?.lastName ?? "—"}</p>
                            <p className="text-emerald-400 font-bold text-sm mt-2">${opp.amount.toLocaleString("es")}</p>
                            <div className="flex gap-1 mt-2">
                              <button onClick={() => markWon(opp.id)} className="flex-1 btn-secondary py-1 text-xs justify-center">
                                <Trophy className="w-3 h-3 text-emerald-400" />
                              </button>
                              <button onClick={() => markLost(opp.id)} className="flex-1 btn-danger py-1 text-xs">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {opps.length === 0 && (
                          <p className="text-slate-600 text-xs text-center py-3">Vacío</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Unassigned */}
                {(() => {
                  const unassigned = opportunities.filter(o => !o.stage && o.status === "OPEN");
                  if (unassigned.length === 0) return null;
                  return (
                    <div className="shrink-0 w-64">
                      <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 mb-2">
                        <p className="text-sm font-semibold text-slate-400">Sin etapa</p>
                      </div>
                      {unassigned.map(opp => (
                        <div key={opp.id} className="glass p-3 mb-2">
                          <p className="text-sm font-medium text-white">{opp.title}</p>
                          <p className="text-emerald-400 text-sm">${opp.amount.toLocaleString("es")}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {tab === "contacts" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setContactModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nuevo contacto
                </button>
              </div>
              <DataTable columns={contactCols} data={contacts} loading={loading} keyExtractor={c => c.id} emptyText="Sin contactos" />
            </div>
          )}

          {tab === "companies" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setCompanyModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nueva empresa
                </button>
              </div>
              <DataTable columns={companyCols} data={companies} loading={loading} keyExtractor={c => c.id} emptyText="Sin empresas" />
            </div>
          )}

          {tab === "tickets" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => setTicketModal(true)} className="btn-primary ml-auto">
                  <Plus className="w-4 h-4" /> Nuevo ticket
                </button>
              </div>
              <DataTable columns={ticketCols} data={tickets} loading={loading} keyExtractor={t => t.id} emptyText="Sin tickets" />
            </div>
          )}

          {tab === "activities" && (
            <div className="space-y-3">
              <button onClick={loadAll} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
              {activities.length === 0 ? (
                <p className="text-slate-500 text-center py-10">Selecciona una oportunidad en el Pipeline para ver sus actividades</p>
              ) : (
                <div className="space-y-2">
                  {activities.map(a => (
                    <GlassCard key={a.id} padding="sm" className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium text-sm">{a.subject}</p>
                        <p className="text-slate-500 text-xs">{a.type} · {a.assignedTo ?? "Sin asignar"}</p>
                      </div>
                      <Badge label={a.status} variant={statusVariant(a.status)} />
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Modal */}
      <Modal open={companyModal} onClose={() => setCompanyModal(false)} title="Nueva empresa" size="sm">
        <div className="space-y-3">
          {[
            { label: "Nombre *", key: "name" }, { label: "Industria", key: "industry" },
            { label: "Teléfono", key: "phone" }, { label: "Sitio web", key: "website" },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" value={String((companyForm as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setCompanyForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setCompanyModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={async () => { setSaving(true); await crmApi.companies.create(companyForm); setCompanyModal(false); loadAll(); setSaving(false); }} className="btn-primary" disabled={saving}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Crear
          </button>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal open={contactModal} onClose={() => setContactModal(false)} title="Nuevo contacto" size="sm">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Nombre *", key: "firstName" }, { label: "Apellido *", key: "lastName" },
            { label: "Email", key: "email" }, { label: "Teléfono", key: "phone" },
            { label: "Cargo", key: "position" },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input className="input" value={String((contactForm as Record<string, unknown>)[f.key] ?? "")}
                onChange={e => setContactForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Empresa</label>
            <select className="input" value={(contactForm.company as { id: number })?.id ?? ""}
              onChange={e => { const c = companies.find(c => c.id === Number(e.target.value)); setContactForm(p => ({ ...p, company: c })); }}>
              <option value="">Sin empresa</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setContactModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={async () => { setSaving(true); await crmApi.contacts.create(contactForm); setContactModal(false); loadAll(); setSaving(false); }} className="btn-primary" disabled={saving}>
            Crear
          </button>
        </div>
      </Modal>

      {/* Opportunity Modal */}
      <Modal open={oppModal} onClose={() => setOppModal(false)} title="Nueva oportunidad" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Título *</label>
            <input className="input" value={oppForm.title ?? ""}
              onChange={e => setOppForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input type="number" className="input" value={oppForm.amount ?? 0}
                onChange={e => setOppForm(p => ({ ...p, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Probabilidad (%)</label>
              <input type="number" min={0} max={100} className="input" value={oppForm.probability ?? 50}
                onChange={e => setOppForm(p => ({ ...p, probability: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="label">Contacto</label>
            <select className="input" value={(oppForm.contact as { id: number })?.id ?? ""}
              onChange={e => { const c = contacts.find(c => c.id === Number(e.target.value)); setOppForm(p => ({ ...p, contact: c })); }}>
              <option value="">Sin contacto</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Etapa</label>
            <select className="input" value={(oppForm.stage as { id: number })?.id ?? ""}
              onChange={e => { const s = stages.find(s => s.id === Number(e.target.value)); setOppForm(p => ({ ...p, stage: s })); }}>
              <option value="">Sin etapa</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setOppModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={async () => { setSaving(true); await crmApi.opportunities.create(oppForm); setOppModal(false); loadAll(); setSaving(false); }} className="btn-primary" disabled={saving}>
            Crear
          </button>
        </div>
      </Modal>

      {/* Ticket Modal */}
      <Modal open={ticketModal} onClose={() => setTicketModal(false)} title="Nuevo ticket" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Asunto *</label>
            <input className="input" value={ticketForm.subject ?? ""}
              onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={ticketForm.category}
                onChange={e => setTicketForm(p => ({ ...p, category: e.target.value }))}>
                {["BILLING", "TECHNICAL", "GENERAL", "COMPLAINT", "OTHER"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select className="input" value={ticketForm.priority}
                onChange={e => setTicketForm(p => ({ ...p, priority: e.target.value }))}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input h-20 resize-none" value={ticketForm.description ?? ""}
              onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setTicketModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={async () => { setSaving(true); await crmApi.tickets.create(ticketForm); setTicketModal(false); loadAll(); setSaving(false); }} className="btn-primary" disabled={saving}>
            Crear
          </button>
        </div>
      </Modal>
    </div>
  );
}
