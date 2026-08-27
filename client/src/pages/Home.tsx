import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  ArrowUpLeft,
  BadgeCheck,
  Ban,
  ChevronLeft,
  CircleAlert,
  ExternalLink,
  Globe2,
  Languages,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Result = {
  id: string;
  kind: "channel" | "group" | "user";
  title: string;
  username: string | null;
  description: string | null;
  photoUrl: string | null;
  publicStats: { label: string; value: number } | null;
  language: string | null;
  matchType: string;
  score: number;
  publicUrl: string | null;
  canMessage: boolean;
  sourceUpdatedAt: string | null;
};

const kindLabel = { channel: "قناة", group: "مجموعة", user: "حساب عام" } as const;

function ResultCard({ result }: { result: Result }) {
  const initials = result.title.trim().slice(0, 1) || "ت";
  const canOpen = Boolean(result.publicUrl);
  return (
    <article className="lift-on-hover overflow-hidden rounded-[1.35rem] border border-[#dcd7c9] bg-white shadow-[0_8px_25px_rgba(6,35,49,0.04)]">
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-deep text-xl font-bold text-mint">
          {result.photoUrl ? <img src={result.photoUrl} alt="" className="h-full w-full object-cover" /> : initials}
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-mint" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-ink sm:text-lg">{result.title}</h3>
            <span className="rounded-full bg-[#edf7f4] px-2.5 py-1 text-[11px] font-semibold text-[#1d6759]">{kindLabel[result.kind]}</span>
          </div>
          {result.username && <p dir="ltr" className="mb-2 truncate text-sm font-medium text-[#277184]">@{result.username}</p>}
          {result.description && <p className="line-clamp-2 text-sm leading-6 text-[#52646b]">{result.description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#ece8dd] bg-[#fcfbf8] px-5 py-3 text-xs text-[#5c7075] sm:px-6">
        <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" />{result.language || "اللغة غير محددة"}</span>
        <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5" />{result.matchType}</span>
        {result.publicStats && <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{result.publicStats.value.toLocaleString("ar")} {result.publicStats.label}</span>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
        <p className="text-xs text-[#708187]">الترتيب: صلة مباشرة وإشارات عامة متاحة</p>
        <div className="flex items-center gap-2">
          {result.canMessage && result.username && (
            <a className="inline-flex items-center gap-1.5 rounded-xl border border-[#c9d7d5] px-3.5 py-2 text-sm font-semibold text-[#245d61] transition hover:bg-[#eef7f5]" href={`https://t.me/${result.username}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> مراسلة
            </a>
          )}
          {canOpen && (
            <a className="inline-flex items-center gap-1.5 rounded-xl bg-deep px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3c4f]" href={result.publicUrl!} target="_blank" rel="noreferrer">
              <Send className="h-4 w-4" /> فتح في تيليجرام
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const searchQuery = trpc.search.public.useQuery({ query: submitted }, { enabled: submitted.length > 0, retry: false });
  const response = searchQuery.data;
  const suggestions = useMemo(() => response?.suggestions ?? [], [response?.suggestions]);
  const results = (response?.results ?? []) as Result[];

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const clean = query.trim();
    if (clean) setSubmitted(clean);
  }

  function useSuggestion(value: string) {
    setQuery(value);
    setSubmitted(value);
  }

  return (
    <div className="min-h-screen overflow-x-hidden" dir="rtl">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="group inline-flex items-center gap-3" aria-label="دليل تيليجرام العام — الصفحة الرئيسية">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-deep text-mint shadow-[0_8px_20px_rgba(6,35,49,0.2)]"><Send className="h-5 w-5 -rotate-45" /></span>
          <span>
            <span className="display-font block text-sm font-bold tracking-tight text-ink">دليل تيليجرام</span>
            <span className="block text-[10px] font-semibold tracking-[0.16em] text-[#527279]">PUBLIC DISCOVERY</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#how-it-works" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-[#456069] hover:bg-white sm:inline-block">كيف يعمل</a>
          <Link href="/architecture" className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8d3c7] bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-[#9bbfbe]">
            <span className="hidden sm:inline">المعمارية</span><span className="sm:hidden">الخطة</span><ChevronLeft className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pb-24">
          <div className="grid-rule absolute inset-x-0 top-8 -z-10 mx-auto h-[30rem] max-w-4xl rounded-[2.5rem] opacity-55 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b6d7d2] bg-[#ebf8f4] px-3.5 py-2 text-xs font-semibold text-[#21655e]">
              <ShieldCheck className="h-4 w-4" /> بحث في الملفات العامة فقط
            </div>
            <h1 className="display-font mx-auto max-w-3xl text-4xl font-bold leading-[1.18] tracking-tight text-deep sm:text-5xl lg:text-6xl">
              اكتشف حضورك العام<br /><span className="text-[#1e7784]">بوضوحٍ وبدون ضوضاء.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#53656c] sm:text-lg">ابحث باسم عام أو <bdi dir="ltr">@username</bdi> أو رابط <bdi dir="ltr">t.me</bdi>. نعالج الصياغات العربية واللاتينية ونحترم حدود الخصوصية في كل خطوة.</p>
          </div>

          <form onSubmit={submitSearch} className="mx-auto mt-10 max-w-3xl rounded-[1.5rem] border border-[#c8dad6] bg-white p-2 shadow-[0_20px_50px_rgba(6,35,49,0.11)]">
            <div className="flex items-center gap-2">
              <Search className="mr-3 h-5 w-5 shrink-0 text-[#4f8c92]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="ابحث في الملفات العامة" className="h-14 min-w-0 flex-1 bg-transparent px-1 text-right text-base font-medium text-ink outline-none placeholder:text-[#8a9899]" placeholder="@username، رابط عام، أو اسم قناة / مجموعة" />
              <button type="submit" disabled={!query.trim() || searchQuery.isFetching} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-deep px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0d3c4f] disabled:cursor-not-allowed disabled:opacity-45 sm:px-5">
                {searchQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="hidden sm:inline">بحث عام</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-2 pt-3 text-[11px] font-medium text-[#647579]">
              <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-[#237b89]" /> تطبيع عربي / لاتيني</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-[#237b89]" /> لا أرقام هاتف أو جهات اتصال</span>
              <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-[#237b89]" /> مصدر معتمد فقط</span>
            </div>
          </form>

          <p className="mx-auto mt-3 max-w-3xl text-center text-[11px] leading-6 text-[#6d7c7d]">نطاق النتائج الحية الحالي: إشارات ورسائل القنوات العامة التي يتيحها المصدر؛ لا يدّعي الموقع فهرسة جميع حسابات أو مجموعات تيليجرام.</p>

          {!submitted && <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-[#63777a]"><span>جرّب:</span><button type="button" onClick={() => useSuggestion("@telegram")} className="rounded-lg bg-white px-2.5 py-1.5 font-medium shadow-sm ring-1 ring-[#e5e1d7] transition hover:text-[#126778]" dir="ltr">@telegram</button><button type="button" onClick={() => useSuggestion("تطوير") } className="rounded-lg bg-white px-2.5 py-1.5 font-medium shadow-sm ring-1 ring-[#e5e1d7] transition hover:text-[#126778]">تطوير</button><button type="button" onClick={() => useSuggestion("https://t.me/telegram")} className="rounded-lg bg-white px-2.5 py-1.5 font-medium shadow-sm ring-1 ring-[#e5e1d7] transition hover:text-[#126778]" dir="ltr">t.me/telegram</button></div>}
        </section>

        {submitted && (
          <section aria-live="polite" className="mx-auto max-w-5xl px-5 pb-16 sm:px-8 lg:px-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-sm font-semibold text-[#1e7784]">نتائج عامة</p><h2 className="mt-1 text-2xl font-bold text-deep">{searchQuery.isFetching ? "جارٍ التحقق من المصدر…" : `نتائج «${submitted}»`}</h2></div>
              {response?.sourceLabel && <span className="rounded-full border border-[#d9e2df] bg-white px-3 py-1.5 text-xs text-[#587175]">المصدر: {response.sourceLabel}</span>}
            </div>
            {suggestions.length > 1 && <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dbe3df] bg-[#f5faf8] p-3 text-xs text-[#557175]"><Sparkles className="h-4 w-4 text-[#2c938d]" /><span>صياغات مقترحة:</span>{suggestions.slice(1).map((suggestion: string) => <button type="button" key={suggestion} onClick={() => useSuggestion(suggestion)} className="rounded-lg bg-white px-2.5 py-1.5 font-semibold text-[#1e6e78] shadow-sm ring-1 ring-[#dcebe7] hover:bg-[#eff9f5]">{suggestion}</button>)}</div>}
            {searchQuery.isFetching && <div className="grid min-h-48 place-items-center rounded-[1.5rem] border border-dashed border-[#b8cbc7] bg-white/65"><div className="flex items-center gap-3 text-sm font-medium text-[#527176]"><Loader2 className="h-5 w-5 animate-spin text-[#257a87]" /> البحث في المصدر العام المصرح به…</div></div>}
            {!searchQuery.isFetching && response?.status === "source_not_configured" && <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="مصدر البيانات الحقيقي غير معتمد بعد" text="تم تجهيز طبقة البحث، لكنها لن تعرض نتائج تجريبية. أضف وسيط بيانات مرخصًا ومفاتيحه على الخادم لبدء عرض الملفات العامة الفعلية." linkText="راجع متطلبات المعمارية" />}
            {!searchQuery.isFetching && response?.status === "restricted" && <EmptyState icon={<Ban className="h-6 w-6" />} title="لا يمكن تنفيذ هذا النوع من البحث" text={response.message ?? "البحث بالأرقام أو محاولة التعرف على الأشخاص غير مدعومين حفاظًا على الخصوصية."} />}
            {!searchQuery.isFetching && response?.status === "source_unavailable" && <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="المصدر غير متاح مؤقتًا" text="احترمنا حدّ الطلبات أو قيود المصدر. جرّب لاحقًا أو استخدم معرفًا عامًا دقيقًا." />}
            {!searchQuery.isFetching && response?.status === "ok" && results.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="لا توجد مطابقة عامة متاحة" text="جرّب @username أو رابط t.me، أو اختر صياغة مقترحة. لا يعني ذلك عدم وجود الكيان؛ قد يكون غير عام أو غير متاح للمصدر." />}
            {!searchQuery.isFetching && response?.status === "ok" && results.length > 0 && <div className="grid gap-4">{results.map((result) => <ResultCard key={result.id} result={result} />)}</div>}
          </section>
        )}

        <section id="how-it-works" className="border-y border-[#ddd9ce] bg-[#ece9df]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:px-10 lg:py-20">
            <div><p className="text-xs font-bold tracking-[0.16em] text-[#247783]">قواعد واضحة</p><h2 className="mt-3 text-3xl font-bold leading-tight text-deep">بحث مفيد، دون اختراق الخصوصية.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#53666b]">لا نعد بنتائج غير متاحة ولا نستنتج معلومات شخصية. تُعرض حالة المصدر بصراحة ويُفسر ترتيب النتائج بالإشارات العامة فقط.</p><Link href="/architecture" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#176f7e] hover:underline">استكشف المخطط والمعمارية <ArrowUpLeft className="h-4 w-4" /></Link></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Feature icon={<Search />} num="01" title="ابحث بصيغة عامة" text="معرّف أو رابط أو اسم معلن، لا رقم هاتف." />
              <Feature icon={<Languages />} num="02" title="طبع الاستعلام" text="نسخ عربية ولاتينية وتهجئات واضحة." />
              <Feature icon={<ShieldCheck />} num="03" title="افتح بأمان" text="روابط مباشرة للملفات العامة فقط." />
            </div>
          </div>
        </section>
            
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="rounded-[2rem] bg-deep p-7 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end"><div><span className="inline-flex items-center gap-2 text-sm font-semibold text-mint"><LockKeyhole className="h-4 w-4" /> خصوصية حسب التصميم</span><h2 className="display-font mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">لا جهات اتصال. لا بحث عكسي. لا بيانات خاصة.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#bdd5d3]">يقتصر الدليل على المعلومات العامة التي يتيحها المصدر صراحة، ويحجب البحث في الأرقام أو المعرّفات الخاصة أو أي استدلال على الهوية.</p></div><div className="rounded-2xl border border-white/15 bg-white/5 p-5"><p className="text-sm leading-7 text-[#d2e4e1]">هل ترغب في ربط مصدر بيانات معتمد؟</p><Link href="/architecture" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-bold text-deep transition hover:bg-[#d0f4e9]">معرفة المتطلبات <ChevronLeft className="h-4 w-4" /></Link></div></div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#dfdbd1] px-5 py-7 text-center text-xs text-[#647579]">دليل مستقل للبحث العام في تيليجرام. لا يرتبط بتليجرام ولا يستخدم شعاره الرسمي.</footer>
    </div>
  );
}

function Feature({ icon, num, title, text }: { icon: React.ReactNode; num: string; title: string; text: string }) {
  return <article className="rounded-2xl border border-[#d8d5ca] bg-[#f8f7f2] p-5"><div className="flex items-center justify-between text-[#247783]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#dbf1eb]">{icon}</span><span className="display-font text-xs font-bold text-[#8a9d9d]">{num}</span></div><h3 className="mt-5 font-bold text-ink">{title}</h3><p className="mt-2 text-xs leading-6 text-[#647579]">{text}</p></article>;
}

function EmptyState({ icon, title, text, linkText }: { icon: React.ReactNode; title: string; text: string; linkText?: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[#bdcfca] bg-white/75 p-8 text-center sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ebf7f3] text-[#257a87]">{icon}</span><h3 className="mt-4 text-lg font-bold text-deep">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#607277]">{text}</p>{linkText && <Link href="/architecture" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#1f7180] hover:underline">{linkText}<ExternalLink className="h-4 w-4" /></Link>}</div>;
}
