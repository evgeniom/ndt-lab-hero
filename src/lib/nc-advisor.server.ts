import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText } from "ai";

export type NcAdvice = {
  summary: string;
  severity: string;
  clauses: { clause: string; title: string; why: string }[];
  causes: { cause: string; likelihood: string }[];
  actions: { action: string; type: string; owner: string; days: number }[];
  effectiveness: string;
};

const SYSTEM = `Вы — эксперт по системам менеджмента испытательных лабораторий неразрушающего контроля (ВИК, УЗК, РК, МПК, ПВК) по ISO/IEC 17025:2017 (ГОСТ ISO/IEC 17025-2019).
По описанию несоответствия верните ТОЛЬКО JSON-объект без markdown:
{"summary": string (1-2 предложения), "severity": "Критическое"|"Значительное"|"Малозначительное"|"Замечание",
"clauses": [{"clause": "6.4.6", "title": "название пункта", "why": "почему применим"}] (2-4 шт),
"causes": [{"cause": string, "likelihood": "Высокая"|"Средняя"|"Низкая"}] (3-5 шт, метод 5 почему / Исикава),
"actions": [{"action": string, "type": "Коррекция"|"Корректирующее"|"Предупреждающее", "owner": "Руководитель ЛНК"|"Менеджер по качеству"|"Метролог"|"Специалист НК", "days": number}] (3-5 шт),
"effectiveness": "как проверить результативность (п. 8.7)"}
Пишите по-русски, кратко, со ссылками на ГОСТ/РД, если уместно.`;

export async function adviseNc(description: string): Promise<NcAdvice> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("ИИ-помощник не настроен");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: SYSTEM,
    prompt: `Несоответствие: ${description}`,
    onError: ({ error }) => { streamError = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let text = "";
  try { text = await result.text; } catch (e) { streamError = e; }
  if (streamError || !text) {
    const status = APICallError.isInstance(streamError) ? streamError.statusCode : undefined;
    if (status === 429) throw new Error("Слишком много запросов. Повторите через минуту.");
    if (status === 402) throw new Error("Закончились кредиты ИИ. Пополните баланс в настройках рабочего пространства.");
    if (status === 403) throw new Error("Доступ к ИИ ограничен настройками рабочего пространства.");
    throw new Error("ИИ-помощник не смог дать ответ. Попробуйте позже.");
  }
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const p = JSON.parse(json) as Partial<NcAdvice>;
    return {
      summary: String(p.summary ?? ""),
      severity: String(p.severity ?? "Значительное"),
      clauses: Array.isArray(p.clauses) ? p.clauses.slice(0, 5) : [],
      causes: Array.isArray(p.causes) ? p.causes.slice(0, 6) : [],
      actions: Array.isArray(p.actions) ? p.actions.slice(0, 6).map((a) => ({ ...a, days: Number(a.days) || 14 })) : [],
      effectiveness: String(p.effectiveness ?? ""),
    };
  } catch {
    throw new Error("Не удалось разобрать ответ ИИ. Повторите запрос.");
  }
}
