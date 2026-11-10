# MLBB Top-Up Hub

المطلوب: بناء تطبيق ويب متكامل (Next.js مع Tailwind CSS) لشحن ألعاب مخصص للعبة Mobile Legends: Bang Bang بنفس توزيع وقوائم أسعار البوستر المرفق، يربط مباشرة مع:

1. FazerCards API (عبر التوثيق: https://api.fzr.cards/public/docs) لتنفيذ شحن الجواهر والباقات.

2. Binance Pay API لمعالجة الدفع المباشر بالعملات الرقمية (USDT).



ملاحظة أمنية ومعمارية أساسية (Environment Variables):

- يتم سحب كافة المفاتيح الحساسة حصراً من متغيرات النظام (System Environment Variables / .env) ولا يتم إدخالها أو تعديلها من لوحة الأدمن.

- المتغيرات المطلوبة:

  * FAZER_API_KEY

  * BINANCE_PAY_API_KEY

  * BINANCE_PAY_SECRET_KEY

- التعامل مع هذه المفاتيح وتوقيع طلبات Binance و FazerCards يتم من خلال Server-Side API Routes خفيفة داخل Next.js (مثل `/api/fzr/*` و `/api/binance/*`) لحماية المفاتيح ومنع تسريبها للـ Client-Side.



---



### الصفحات المطلوبة (3 صفحات فقط):



1. لوحة تحكم الإدارة (صفحة الأدمن - /admin):

- إدارة قوائم وهوامش الأسعار:

  * جدول يعرض باقات الشحن وسعر التكلفة القادم من الـ API.

  * إمكانية تحديد سعرين لكل باقة: سعر البيع للجمهور وسعر مخفّض للتاجر (سعر الجملة).

  * خيار لوضع هامش ربح مئوي عام أو ضبط السعر يدوياً لكل باقة بالجنيه المصري (EGP) وما يقابله بـ USDT.

- إدارة الباقات المخصصة (Custom Bundles):

  * إنشاء وتعديل عروض خاصة (مثل: 3 Weekly Pass، عروض الدبل 50+50، باقة شهري، Weekly Bundle) وربطها برمز المنتج المقابل في FazerCards.

- حفظ وتحديث الأسعار المعدلة محلياً أو عبر State موحدة ليتم تطبيقها فوراً على واجهتي التاجر والعميل.



2. بوابة التاجر (صفحة التاجر - /merchant):

- عرض جميع الباقات بأسعار الجملة المحددة من قِبل الأدمن فقط.

- نموذج الشحن السريع:

  * إدخال معرف اللاعب (User ID) ورقم السيرفر (Zone ID).

  * اختيار الباقة وعرض إجمالي المبلغ المطلوب بسعر الجملة.

  * زر بدء الدفع لتوليد QR Code ومعاملة Binance Pay فورية.

  * التحقق التلقائي من السداد، وفور التأكيد يتم استدعاء FazerCards لشحن الحساب وعرض تفاصيل العملية ورقم الـ Transaction.



3. واجهة متجر العميل (صفحة الزبائن - /):

- عرض الباقات بتصنيفات مطابقة لبوستر الأسعار:

  * الجواهر الأساسية (MLBB Diamonds): من 86 وحتى 30,059 جوهرة.

  * بطاقات الويكلي (Weekly Pass): باقة 1 Pass وباقة 3 Passes.

  * الجواهر المضاعفة (Double Diamond): فئات (50+50، 150+150، 250+250، 500+500).

  * الحزم المميزة (The Bundle): مثل Weekly Bundle و Shahri Bundle.

  * عرض الأسعار للعميل بالجنيه المصري (EGP) والسعر المعادل بـ USDT.

- نافذة الشحن والدفع (Checkout Modal):

  * إدخال الـ User ID والـ Zone ID مع توضيح إرشادي لمكانهم في اللعبة.

  * إنشاء طلب دفع فوري عبر Binance Pay مع إظهار رمز QR وزر فتح تطبيق Binance.

  * متابعة سداد الفاتورة آلياً (Polling)، وفور اكتمال الدفع يتم تنفيذ الشحن تلقائياً عبر FazerCards وعرض شاشة النجاح.



---



المخرجات المطلوبة:

- ملف `.env.example` يوضح المتغيرات المطلوبة.

- مسارات Next.js API Routes لتأمين الاتصال بالـ APIs بدون كشف المفاتيح في المتصفح.

- الأكواد الكاملة للصفحات الثلاث والمكونات التفاعلية بتصميم Dark Gaming م

ع لمسات Cyan & Purple Neon متجاوب مع جميع الشاشات.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6acb30c9-87e3-4e72-a637-2e90e08782cb).

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
