import { ImagePlus } from "lucide-react";
import { dayNumber, formatDate, type ChallengeSettings, type ProgressPhoto } from "@/lib/soft-challenge";
import { useLanguage } from "./language-provider";

export function ProgressPictureCard({ settings, today, nextPicture, photos }: { settings: ChallengeSettings; today: string; nextPicture?: string; photos: ProgressPhoto[] }) {
  const { t } = useLanguage();
  const hasTodayPhoto = photos.some((photo) => photo.date === today);
  const firstPictureDue = settings.includeDayOnePicture && today === settings.startDate && !hasTodayPhoto;
  const daysUntil = nextPicture ? Math.max(0, dayNumber(today, nextPicture) - 1) : 0;

  return <section className="card overview-progress-card" data-testid="progress-picture-card">
    <div className="overview-progress-copy"><div className="round-icon lavender"><ImagePlus size={19} /></div><div><div className="eyebrow">{t(firstPictureDue ? "ELSŐ PROGRESS KÉP" : "KÖVETKEZŐ PROGRESS KÉP")}</div><h3>{t(firstPictureDue ? "Induló kép" : "Következő haladásfotó")}</h3><p className="muted">{t(firstPictureDue ? "Ma, az indulás napján esedékes. Ez lesz a kihívás első progress képe." : nextPicture ? "A kihívás haladását követő következő képes emlékeztető." : "Minden ütemezett progress kép elkészült.")}</p></div></div>
    {nextPicture ? <div className="overview-progress-date"><strong>{formatDate(nextPicture, { weekday: "long", month: "long", day: "numeric" })}</strong><span>{firstPictureDue ? t("az indulás napja") : `${daysUntil} ${t("nap múlva")} · ${dayNumber(settings.startDate, nextPicture)}. ${t("nap")}`}</span></div> : null}
  </section>;
}
