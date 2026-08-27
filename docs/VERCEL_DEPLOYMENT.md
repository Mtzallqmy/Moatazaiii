# تشغيل المنصة على Vercel

## النتيجة المختصرة

يمكن تشغيل المشروع على Vercel، لكن النقل ليس «واجهة ثابتة فقط». الواجهة مبنية بـ Vite، بينما البحث العام وقاعدة MySQL والتحديث الدوري تعتمد على خادم Express. تتحول تطبيقات Express على Vercel إلى Vercel Function واحدة، لذلك يلزم فصل إنشاء التطبيق عن عملية `listen()` الحالية وتصديره من نقطة دخول يتعرف عليها Vercel. [1]

## المساران المتاحان

| المسار | ما يبقى على Vercel | ما يحتاج عملاً إضافيًا | الملاءمة |
|---|---|---|---|
| Vercel كامل | الواجهة وخادم Express كدالة واحدة | فصل `app` عن `listen()`، إضافة نقطة `/api/cron` محمية، وربط MySQL خارجي | مناسب عند الرغبة بتجميع كل شيء داخل Vercel |
| Vercel للواجهة + Railway للخادم | الواجهة والأصول الثابتة | ضبط عنوان API وCORS؛ يبقى MySQL وCron في Railway | أقل مخاطرة للتطبيق الحالي |

## ما يلزم لمسار Vercel الكامل

1. إنشاء نقطة دخول Vercel تصدّر كائن Express افتراضيًا؛ توثق Vercel دعم تطبيق Express عبر التصدير الافتراضي أو مستمع منفذ، لكن نقطتها المكتشفة يجب أن تكون في جذر المشروع أو في `src/` ضمن مسار معتمد. [1]
2. فصل خادم Express الحالي إلى وحدة `app` مشتركة، ثم استخدام وحدة Node محلية للتطوير فقط ووحدة Vercel لتشغيل الدالة في الإنتاج.
3. إبقاء قاعدة MySQL خارج Vercel (مثل Railway MySQL أو مزود آخر). يستخدم التطبيق `DATABASE_URL` الخادمي؛ لا ينتقل محتوى قاعدة البيانات تلقائيًا. أضف اتصالاً بـ TLS إن طلب المزود ذلك.
4. إنشاء مسار HTTP مستقل للتحديث، مثل `/api/cron/public-index-refresh`، والتحقق من توقيع `CRON_SECRET` قبل تنفيذ أي تحديث. تستدعي Vercel Cron المسار بطلب GET إلى نطاق الإنتاج. [2]
5. إضافة جدول Cron بتنسيق خمسة حقول وفي التوقيت UTC، مثل `15 2 * * *` للتشغيل يوميًا عند 02:15 UTC. [2]

## المتغيرات في Vercel

أضف القيم التالية في **Project Settings → Environment Variables** وطبّقها على Production وPreview عند الحاجة. لا تضعها في GitHub أو `vercel.json`.

| المفتاح | القيمة | الحساسية |
|---|---|---|
| `NODE_ENV` | `production` | عادي |
| `DATABASE_URL` | رابط MySQL الخارجي | Sensitive |
| `TELEGRAM_PUBLIC_SEARCH_BASE_URL` | عنوان وسيط البحث المرخص | عادي |
| `TELEGRAM_PUBLIC_SEARCH_API_KEY` | مفتاح وسيط البحث | Sensitive |
| `JWT_SECRET` | قيمة عشوائية طويلة | Sensitive |
| `CRON_SECRET` | قيمة عشوائية مستقلة لحماية مسار التحديث | Sensitive |
| `INDEX_REFRESH_LIMIT` | من 1 إلى 25 | عادي |

تسمح Vercel بحفظ القيم الحساسة على نحو غير قابل للقراءة بعد الإنشاء ضمن بيئات Preview وProduction. [3]

## تنبيه تشغيلي

لا تستخدم هذا المشروع كما هو مع `vercel deploy` قبل فصل نقطة دخول Express؛ فهذا المسار الحالي مُعدّ لخادم Node مستمر. عند اختيار Vercel كوجهة نهائية، نفّذ فصل التطبيق وإضافة حماية Cron ثم اختبر البحث والتحديث وقاعدة البيانات في بيئة Preview قبل الإنتاج.

## المراجع

[1]: https://vercel.com/docs/frameworks/backend/express "Express on Vercel"
[2]: https://vercel.com/docs/cron-jobs "Vercel Cron Jobs"
[3]: https://vercel.com/docs/environment-variables/sensitive-environment-variables "Sensitive environment variables"
