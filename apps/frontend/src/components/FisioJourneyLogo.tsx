import logo from "@/assets/logo-fisio-journey.png";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export default function FisioJourneyLogo({ className }: Props) {
  return (
    <img
      src={logo}
      alt="Fisio Journey"
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}