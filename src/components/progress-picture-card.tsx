import { ImagePlus } from "lucide-react";
import { dayNumber, formatDate, type ChallengePhase, type ChallengeSettings, type ProgressPhoto } from "@/lib/soft-challenge";
import { useLanguage } from "./language-provider";

export function ProgressPictureCard({ settings, today, nextPicture, photos, phase }: { settings: ChallengeSettings; today: string; nextPicture?: string; photos: ProgressPhoto[]; phase: ChallengePhase }) {
  const { t } = useLanguage();
  const firstPictureDue = settings.includeDayOnePicture && nextPicture === settings.startDate && !photos.some((photo) => photo.date === settings.startDate);
  const daysUntil = nextPicture ? Math.max(0, dayNumber(today, nextPicture) - 1) : 0;

  return <section className="card overview-progress-card" data-testid="progress-picture-card">
    <div className="overview-progress-copy"><div className="round-icon"><ImagePlus size={21} /></div><div><div className="eyebrow">{t(firstPictureDue ? "ELSŐ PROGRESS KÉP" : "KÖVETKEZŐ PROGRESS KÉP")}</div><h3>{t(firstPictureDue ? "Induló kép" : "Következő progress kép")}</h3><p className="muted">{t(firstPictureDue ? (phase === "upcoming" ? "Az első progress kép a kihívás indulásakor lesz esedékes." : "Ma, az indulás napján esedékes. Ez lesz a kihívás első progress képe.") : nextPicture ? "A következő, ütemezett progress kép időpontja." : "Minden ütemezett progress kép elkészült.")}</p></div></div>
    {nextPicture ? <div className="overview-progress-date"><strong>{formatDate(nextPicture, { weekday: "long", month: "long", day: "numeric" })}</strong><span>{firstPictureDue ? t("az indulás napja") : `${daysUntil} ${t("nap múlva")} · ${dayNumber(settings.startDate, nextPicture)}. ${t("nap")}`}</span></div> : null}
  </section>;
}
