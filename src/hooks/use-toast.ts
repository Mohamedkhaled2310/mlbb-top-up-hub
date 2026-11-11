import { toast as sonnerToast } from "sonner";

type ToastOpts = { title?: string; description?: string; variant?: "default" | "destructive" };

export function toast({ title, description, variant }: ToastOpts) {
  const message = title || description || "";
  const desc = title ? description : undefined;
  if (variant === "destructive") return sonnerToast.error(message, { description: desc });
  return sonnerToast(message, { description: desc });
}

export function useToast() {
  return { toast };
}
