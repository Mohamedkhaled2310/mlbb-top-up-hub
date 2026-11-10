import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { HelpCircle, CheckCircle2 } from "lucide-react";

interface PlayerIdGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerIdGuideModal({ open, onOpenChange }: PlayerIdGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0e1424] border border-cyan-500/30 text-slate-100 p-6 rounded-2xl shadow-2xl shadow-cyan-950/50">
        <DialogHeader>
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <HelpCircle className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-white">
              أين تجد User ID و Zone ID؟
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            اتبع الخطوات البسيطة التالية داخل لعبة Mobile Legends للعثور على بيانات حسابك:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Step 1 */}
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-[#0a0f1d] p-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm">
              1
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-200">
                افتح اللعبة واضغط على الصورة الرمزية (Avatar)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                في أعلى الزاوية اليسرى من الشاشة الرئيسية.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 rounded-xl border border-slate-800 bg-[#0a0f1d] p-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-sm">
              2
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-200">
                انتقل إلى تبويب "المعلومات الأساسية" (Basic Info)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                ستجد رقم الحساب مكتوباً بجانب صورتك بالشكل التالي:
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-cyan-500/40 p-2 font-mono text-xs">
                <span className="text-slate-400">ID:</span>
                <span className="text-cyan-400 font-bold text-sm">123456789</span>
                <span className="text-purple-400 font-bold text-sm">(1234)</span>
              </div>
            </div>
          </div>

          {/* Illustration details */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>
                <strong>User ID:</strong> هو الرقم الطويل قبل القوسين (مثال: 123456789)
              </span>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-400" />
              <span>
                <strong>Zone ID / Server:</strong> هو الرقم المكون من 4 إلى 5 أرقام داخل القوسين
                (مثال: 1234)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 font-bold text-white text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
        >
          فهمت، حسناً
        </button>
      </DialogContent>
    </Dialog>
  );
}
