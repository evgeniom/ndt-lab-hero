# Lab Master

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval.

Build a desktop-grade UI for a Non-Destructive Testing (NDT / неразрушающий контроль) laboratory compliant with ISO/IEC 17025.

Key UI & Functional Scope:
1. Desktop Layout & Styling:
   - High information density suitable for engineering and laboratory desktop software (clean technical design, compact typography, dark/light theme toggle, desktop-like sidebar, top control bar with breadcrumbs/search, status bar at bottom).
   - Sidebar navigation: "Дашборд" (активный), "Журнал испытаний" (Реестр протоколов), "Оборудование и поверки", "Специалисты и аттестация", "Качество и аудит ISO 17025".

2. Main Screen (Дашборд):
   - Header with quick stats cards:
     * Активные испытания в работе
     * Протоколы, готовые к утверждению (ISO 17025)
     * Оборудование с истекающим сроком поверки (<30 дней)
     * Индекс соответствия СМК / готовность к аудиту
   - Statistical Analytics (Диаграммы и графики):
     * Распределение испытаний по методам НК (ВИК, УЗК, РК, МПК, ПВК) — диаграмма/барчарт.
     * Динамика контроля и процент годности/дефектов за период (line/area chart).
     * Категории выявленных дефектов (трещины, непровары, поры, шлаковые включения).
     * Статус метрологического парка (в строю, на калибровке, требует поверки).
   - Календарь задач с отметками (Интерактивный календарь + список дел):
     * Полноценный календарный вид (месяц/неделя) с цветными маркерами категорий:
       - Красный маркер: Окончание срока поверки прибора / калибровки образца.
       - Синий маркер: Плановый выездной контроль объекта.
       - Желтый маркер: Срок продления аттестации дефектоскописта.
       - Зеленый маркер: Внутренний аудит по ISO 17025.
     * Боковая или нижняя панель при клике на дату: детальный список задач/событий на выбранный день с чекбоксами выполнения, приоритетами и возможностью добавить задачу.
   - Быстрые действия: «Новое испытание», «Внести замер», «Сформировать протокол», «Журнал калибровок».

3. Модальные окна / просмотр:
   - Карточка быстрой детализации протокола / задачи при клике.
   - Реалистичные отраслевые данные на русском языке (дефектоскопы USN 60, А1212, рентген РПД, калибровочные образцы V1/V2, сварные соединения труб, нормативные документы ГОСТ/ISO).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ndt-lab-hero.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03b144a6-060c-4802-a32b-4603e96a3e07).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
