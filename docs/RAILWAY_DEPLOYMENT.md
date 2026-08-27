# النشر على Railway

## ما ينتقل وما لا ينتقل

ينتقل كود الواجهة والخادم وملفات ترحيل Drizzle إلى Railway، لكن **لا تنتقل** أسرار Manus أو جلسات OAuth أو قاعدة البيانات المدارة هنا تلقائيًا. جهّز قاعدة MySQL جديدة في مشروع Railway، ثم نفّذ الترحيل على القاعدة الجديدة؛ لا تُنسخ أية بيانات خاصة أو مفاتيح إلى GitHub.

تتعرف Railway على تطبيقات Node.js عند النشر من مستودع GitHub وتتيح إضافة فحص صحي وربط نطاق عام من إعدادات الخدمة. [1] تتوفر قاعدة MySQL داخل المشروع بمتغير `MYSQL_URL`، ويمكن تمريرها إلى التطبيق باسم `DATABASE_URL` باستخدام متغير مرجعي. [2] [3]

## تجهيز المستودع

أنشئ مستودع GitHub خاصًا، وارفع هذا المشروع إليه دون أي ملف `.env`. من لوحة Railway اختر **New Project → Deploy from GitHub repo** ثم اختر المستودع. استخدم الأوامر التالية في إعدادات خدمة الويب:

| الإعداد | القيمة |
|---|---|
| Build Command | `pnpm build` |
| Start Command | `pnpm start` |
| Healthcheck Path | `/health` |
| Restart Policy | `ON_FAILURE` |
| Domain | أنشئ نطاق Railway عام من Settings → Networking |

## متغيرات خدمة الويب

أضف خدمة **MySQL** إلى مشروع Railway أولًا، ثم أضف المتغيرات الآتية إلى خدمة الويب. تعامل مع المفتاحين المشار إليهما بعلامة **Sealed** في Railway كي لا يظهرا في الواجهة أو عبر الواجهة البرمجية. [3]

| المفتاح | القيمة أو المصدر |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` — استبدل `MySQL` باسم خدمة القاعدة لديك |
| `TELEGRAM_PUBLIC_SEARCH_BASE_URL` | عنوان وسيط البحث المرخص الموجود لديك |
| `TELEGRAM_PUBLIC_SEARCH_API_KEY` | مفتاح الوسيط، مع تفعيل Sealed |
| `JWT_SECRET` | قيمة عشوائية طويلة، مع تفعيل Sealed |
| `INDEX_REFRESH_LIMIT` | `20` كحد محافظ للتحديث الدوري |

لا تُضف `VITE_FRONTEND_FORGE_API_KEY` أو أي أسرار Manus إلى Railway؛ التطبيق الحالي لا يحتاجها لمسار البحث العام.

## ترحيل قاعدة البيانات

بعد تعريف `DATABASE_URL`، نفّذ في Railway CLI محليًا أو أضف مؤقتًا أمر ما قبل النشر التالي إلى الخدمة: `pnpm drizzle-kit migrate`. يطبّق هذا ملفات `drizzle/` الموجودة على قاعدة MySQL الجديدة. افصل هذا الإجراء عن مسار الويب إذا احتجت مراجعة يدوية للترحيل في الإنتاج.

## مهمة التحديث الدوري

أنشئ **خدمة Railway ثانية** من نفس المستودع للنشاط الدوري، ولا تستخدم خدمة الويب نفسها. عيّن لها المتغيرات نفسها المتعلقة بالقاعدة والمصدر، ثم اضبط:

| الإعداد | القيمة |
|---|---|
| Start Command | `pnpm refresh:index` |
| Cron Schedule | `15 2 * * *`، أي 02:15 UTC يوميًا |
| `INDEX_REFRESH_LIMIT` | بين 1 و25 |

تنفذ خدمة Cron أمر البدء ثم تنهي العملية؛ وهذا يتوافق مع نموذج Railway للمهام الدورية. أدنى تواتر يسمح به Railway هو خمس دقائق، وجميع جداول Cron تستخدم UTC. [4] لا تستخدم مؤقتًا داخل خادم الويب.

## فحص ما بعد النقل

افتح `https://<railway-domain>/health` وتأكد من استجابة `{"status":"ok"}`، ثم اختبر بحثًا باسم عام. راقب سجلات خدمة الويب وسجل خدمة Cron بشكل منفصل. ينحصر المصدر الحالي في إشارات ورسائل القنوات العامة؛ لا يضمن تغطية عالمية للحسابات أو المجموعات.

## المراجع

[1]: https://docs.railway.com/guides/deploy-node-express-api-with-auto-scaling-secrets-and-zero-downtime "Deploy Node.js & Express API with Railway"
[2]: https://docs.railway.com/databases/mysql "Railway MySQL"
[3]: https://docs.railway.com/variables "Using Variables on Railway"
[4]: https://docs.railway.com/cron-jobs "Railway Cron Jobs"
