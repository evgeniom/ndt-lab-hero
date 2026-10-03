import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNcAdvice } from "@/lib/nc-advisor.functions";
type NcAdvice = Awaited<ReturnType<typeof getNcAdvice>>;

export type AdvicePick = { title: string; clause: string; severity: string; cause: string; action: string };

const tone = (v: string) => (v === "Высокая" || v === "Критическое" ? "bg-red/15 text-red" : v === "Средняя" || v === "Значительное" ? "bg-yellow/20 text-yellow" : "bg-green/15 text-green");

export function NcAdvisor({ open, onClose, canRegister, onRegister }: { open: boolean; onClose: () => void; canRegister: boolean; onRegister: (p: AdvicePick) => void }) {
  const advise = useServerFn(getNcAdvice);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<NcAdvice | null>(null);

  const run = async () => {
    setLoading(true); setError(null); setRes(null);
    try { setRes(await advise({ data: { description: text } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка запроса"); }
    finally { setLoading(false); }
  };

  const register = () => {
    if (!res) return;
    onRegister({
      title: text.trim().split(/[.\n]/)[0]!.slice(0, 120),
      clause: res.clauses[0]?.clause ?? "",
      severity: ["Значительное", "Малозначительное", "Замечание"].includes(res.severity) ? res.severity : "Значительное",
      cause: res.causes[0]?.cause ?? "",
      action: res.actions.map((a) => a.action).join("; "),
    });
    setText(""); setRes(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />ИИ-анализ несоответствия</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Опишите несоответствие — помощник предложит применимые пункты ISO/IEC 17025, вероятные причины и корректирующие действия. Решение остаётся за менеджером по качеству.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Например: при УЗК сварного стыка трубопровода Ø325×10 использован СО-3 V1 с истёкшим свидетельством о калибровке, протокол выдан заказчику…" className="w-full rounded-sm border bg-background p-2 text-xs" />
        <div className="flex justify-end gap-2">
          <Button size="sm" disabled={loading || text.trim().length < 10} onClick={run}>{loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}{loading ? "Анализ…" : "Проанализировать"}</Button>
        </div>
        {error && <div className="rounded-sm border border-red/40 bg-red/8 p-2 text-xs text-red">{error}</div>}
        {res && (
          <div className="space-y-3 text-xs">
            <div className="rounded-sm border bg-muted/40 p-2"><span className={`mr-2 rounded-sm px-1.5 py-0.5 text-[11px] ${tone(res.severity)}`}>{res.severity}</span>{res.summary}</div>
            <section><h3 className="mb-1 font-semibold">Применимые пункты ISO/IEC 17025</h3>
              {res.clauses.map((c, i) => <div key={i} className="border-t py-1.5"><span className="mr-2 font-mono font-medium">п. {c.clause}</span><span className="font-medium">{c.title}</span><div className="text-muted-foreground">{c.why}</div></div>)}
            </section>
            <section><h3 className="mb-1 font-semibold">Вероятные коренные причины</h3>
              {res.causes.map((c, i) => <div key={i} className="flex items-start gap-2 border-t py-1.5"><span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] ${tone(c.likelihood)}`}>{c.likelihood}</span>{c.cause}</div>)}
            </section>
            <section><h3 className="mb-1 font-semibold">Предлагаемые действия (CAPA)</h3>
              <table className="w-full"><thead className="text-left text-muted-foreground"><tr><th className="py-1">Действие</th><th>Тип</th><th>Ответственный</th><th>Срок</th></tr></thead>
                <tbody>{res.actions.map((a, i) => <tr key={i} className="border-t"><td className="py-1.5 pr-2">{a.action}</td><td>{a.type}</td><td>{a.owner}</td><td className="tabular-nums">{a.days} дн.</td></tr>)}</tbody></table>
            </section>
            {res.effectiveness && <section><h3 className="mb-1 font-semibold">Проверка результативности (п. 8.7)</h3><p>{res.effectiveness}</p></section>}
            <div className="flex justify-end"><Button size="sm" disabled={!canRegister} onClick={register}>Зарегистрировать несоответствие</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
