import { Link } from "wouter";
import { ArrowRight, Database, KeyRound, Layers3, LockKeyhole, RefreshCw, Route, ShieldCheck } from "lucide-react";

const layers = [
  { icon: <Layers3 />, title: "واجهة البحث", text: "واجهة RTL تطبّع المدخلات وتعرض فقط البيانات العامة وحالة المصدر بوضوح." },
  { icon: <Route />, title: "خادم وسيط", text: "يتحقق من المدخلات، يحظر أرقام الهاتف، ويوجه البحث إلى موصل المصدر المرخص." },
  { icon: <Database />, title: "تخزين مؤقت محدود", text: "يحتفظ بحد أدنى من فهرس الكيانات العامة ووقت آخر تحديث دون رسائل أو جهات اتصال." },
  { icon: <KeyRound />, title: "مصدر معتمد", text: "وسيط مستقل بتفويض TDLib/Telegram صحيح؛ تبقى مفاتيحه وجلساته خارج المتصفح." },
];

export default function Architecture() {
  return <main dir="rtl" className="min-h-screen bg-paper">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#286e7c] hover:underline"><ArrowRight className="h-4 w-4" /> العودة للبحث</Link><span className="display-font text-sm font-bold text-ink">دليل تيليجرام العام</span></header>
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:pb-24 lg:pt-14"><div className="max-w-3xl"><p className="text-xs font-bold tracking-[0.15em] text-[#217582]">ARCHITECTURE & COMPLIANCE</p><h1 className="display-font mt-4 text-4xl font-bold leading-tight text-deep sm:text-5xl">معمارية دقيقة تحمي البحث العام.</h1><p className="mt-5 text-base leading-8 text-[#586a70]">يعمل المنتج كواجهة بحث لا كأداة كشف هوية: يبدأ باستعلام عام، ويمرّ بحارس الخصوصية، ثم يصل إلى مصدر بيانات مرخص فقط. لا توجد نتائج وهمية عند غياب اعتماد المصدر.</p></div>
      <div className="relative mt-12 grid gap-4 md:grid-cols-2">{layers.map((layer, index) => <article key={layer.title} className="relative rounded-[1.5rem] border border-[#d8d5ca] bg-white p-6 shadow-[0_10px_30px_rgba(6,35,49,0.04)]"><span className="display-font absolute left-5 top-5 text-4xl font-bold text-[#e9eee9]">0{index + 1}</span><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e6f5f0] text-[#18717d]">{layer.icon}</span><h2 className="mt-6 text-lg font-bold text-deep">{layer.title}</h2><p className="mt-2 text-sm leading-7 text-[#617277]">{layer.text}</p></article>)}</div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3"><Policy icon={<ShieldCheck />} title="النطاق" text="القنوات والمجموعات والحسابات ذات اسم مستخدم عام فقط. لا أرقام هاتف، ولا دفتر عناوين، ولا استدلال على الهوية." /><Policy icon={<RefreshCw />} title="التحديث" text="تحديث دوري محدود للكيانات المفهرسة سابقًا فقط، مع حدّ طلبات ومفتاح إيقاف عند ردود التقييد." /><Policy icon={<LockKeyhole />} title="الاعتمادات" text="تُحفظ مفاتيح الوسيط على الخادم. يتطلب TDLib هوية تطبيق وتفويضًا صالحًا، ولا يوضع في المتصفح." /></div>
      <div className="mt-10 rounded-[1.75rem] bg-deep p-7 text-white sm:p-9"><h2 className="text-xl font-bold">ترتيب يمكن فهمه</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[#c9dddd]">تتقدم مطابقة المعرف والرابط، ثم مطابقة عنوان الكيان. لا تدخل إشارات عامة مثل عدد المشتركين إلا عندما يعيدها المصدر، ولا ندّعي قياس النشاط إن لم يكن متاحًا.</p><p className="mt-5 border-r-2 border-mint pr-4 text-sm leading-7 text-mint">تقتضي شروط Telegram API حماية الخصوصية، وامتلاك <bdi dir="ltr">api_id</bdi> خاص بالتطبيق، والامتناع عن استخدام بيانات المنصة لتدريب نماذج الذكاء الاصطناعي.</p></div>
      <div className="mt-8 rounded-2xl border border-[#d8d5ca] bg-[#f8f7f2] p-6"><h2 className="font-bold text-deep">متطلبات تفعيل النتائج الحقيقية</h2><p className="mt-2 text-sm leading-7 text-[#596c71]">أضف عنوان وسيط بحث مرخص ومفتاحه على الخادم. يجب أن يعيد الوسيط حقولًا عامة فقط، وأن يراعي معدل الطلبات وحدود Telegram. لا يكفي Bot API وحده لإجراء بحث عالمي عام.</p></div>
    </section>
  </main>;
}

function Policy({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="rounded-2xl border border-[#d8d5ca] bg-[#f8f7f2] p-5"><span className="text-[#277c86]">{icon}</span><h2 className="mt-4 font-bold text-deep">{title}</h2><p className="mt-2 text-sm leading-7 text-[#63757a]">{text}</p></article>; }

