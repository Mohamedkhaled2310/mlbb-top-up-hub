import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { HelpCircle, CheckCircle2, Copy } from "lucide-react";

interface PlayerIdGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId?: string;
}

export function PlayerIdGuideModal({ open, onOpenChange, gameId = "mlbb" }: PlayerIdGuideModalProps) {
  // Guide content per game
  const guides: Record<
    string,
    {
      title: string;
      desc: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      exampleId: string;
      exampleExtra?: string;
      clarifications: { label: string; text: string; example: string }[];
    }
  > = {
    mlbb: {
      title: "أين تجد User ID و Zone ID؟",
      desc: "اتبع الخطوات التالية داخل لعبة Mobile Legends للعثور على بيانات حسابك:",
      step1Title: "افتح اللعبة واضغط على صورتك الرمزية (Avatar)",
      step1Desc: "في أعلى الزاوية اليسرى من الشاشة الرئيسية للعبة.",
      step2Title: "انتقل إلى تبويب 'المعلومات الأساسية' (Basic Info)",
      step2Desc: "ستجد رقم الحساب مكتوباً بجانب صورتك بالشكل التالي:",
      exampleId: "123456789",
      exampleExtra: "(1234)",
      clarifications: [
        {
          label: "User ID:",
          text: "الرقم الطويل المكون من 8 إلى 9 أرقام",
          example: "123456789",
        },
        {
          label: "Zone ID / Server:",
          text: "الرقم المكون من 4 إلى 5 أرقام داخل القوسين",
          example: "1234",
        },
      ],
    },
    pubg: {
      title: "أين تجد معرف ببجي (Character ID)؟",
      desc: "اتبع الخطوات التالية داخل لعبة PUBG Mobile لنسخ رقم حسابك:",
      step1Title: "افتح اللعبة واضغط على صورتك الشخصية (الملف الشخصي)",
      step1Desc: "في أعلى الزاوية اليسرى من الشاشة الرئيسية للعبة.",
      step2Title: "انسخ رقم الـ Character ID الخاص بك",
      step2Desc: "ستجد رقم المعرف بجوار اسمك وصورتك، اضغط على أيقونة النسخ المجاورة له:",
      exampleId: "5123456789",
      clarifications: [
        {
          label: "Character ID:",
          text: "هو رقم الآيدي المكون من 8 إلى 11 رقماً (لا تحتاج إلى سيرفر أو باسورد)",
          example: "5123456789",
        },
      ],
    },
    freefire: {
      title: "أين تجد معرف فري فاير (Player ID)؟",
      desc: "اتبع الخطوات التالية داخل لعبة Free Fire لنسخ رقم الآيدي الخاص بك:",
      step1Title: "افتح اللعبة واضغط على شعار ملفك الشخصي (Banner/Avatar)",
      step1Desc: "في الزاوية العليا اليسرى من الواجهة الرئيسية للعبة.",
      step2Title: "انسخ رقم الـ UID من بطاقة اللاعب",
      step2Desc: "ستجد رقم الـ UID مكتوباً تحت اسم حسابك، اضغط على زر النسخ بجانبه:",
      exampleId: "1234567890",
      clarifications: [
        {
          label: "Player ID (UID):",
          text: "هو المعرف الرقمي الوحيد المطلوب لشحن جواهر فري فاير فورياً",
          example: "1234567890",
        },
      ],
    },
    hok: {
      title: "أين تجد معرف Honor of Kings (Player ID)؟",
      desc: "اتبع الخطوات التالية داخل لعبة Honor of Kings للعثور على رقم المعرف:",
      step1Title: "افتح اللعبة واضغط على صورتك الشخصية (Avatar)",
      step1Desc: "في أعلى يسار الشاشة لفتح الملف الشخصي العام للحساب.",
      step2Title: "انتقل لقسم الإعدادات أو معلومات الحساب الأساسية",
      step2Desc: "انسخ الـ UID أو Player ID المعروض بجوار اسمك:",
      exampleId: "987654321",
      clarifications: [
        {
          label: "Honor of Kings UID:",
          text: "الرقم التعريفي المخصص لحسابك لشحن التوكنز وتذاكر اللعبة مباشرة",
          example: "987654321",
        },
      ],
    },
  };

  const currentGuide = (guides[gameId] || guides["mlbb"])!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0e1424] border border-cyan-500/30 text-slate-100 p-4 sm:p-6 rounded-2xl shadow-2xl shadow-cyan-950/50">
        <DialogHeader className="text-right sm:text-right">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <HelpCircle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-base sm:text-lg font-bold text-white">
              {currentGuide.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-xs sm:text-sm text-right">
            {currentGuide.desc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 text-right">
          {/* Step 1 */}
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-[#0a0f1d] p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm">
              1
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-slate-200">{currentGuide.step1Title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{currentGuide.step1Desc}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-[#0a0f1d] p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm">
              2
            </div>
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-slate-200">{currentGuide.step2Title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{currentGuide.step2Desc}</p>

              {/* LTR container to prevent parenthesis inversion */}
              <div
                dir="ltr"
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-cyan-500/40 p-2 font-mono text-xs"
              >
                <span className="text-slate-400">ID:</span>
                <span className="text-cyan-400 font-bold text-sm">{currentGuide.exampleId}</span>
                {currentGuide.exampleExtra && (
                  <span className="text-purple-400 font-bold text-sm">
                    {currentGuide.exampleExtra}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clarifications */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-xs space-y-2">
            {currentGuide.clarifications.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-cyan-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                <div>
                  <strong>{item.label}</strong> {item.text}{" "}
                  <span dir="ltr" className="font-mono text-cyan-200 font-semibold">
                    (مثال: {item.example})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full mt-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-cyan-500 py-2.5 font-bold text-white text-xs sm:text-sm hover:opacity-90 transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
        >
          فهمت، حسناً
        </button>
      </DialogContent>
    </Dialog>
  );
}
