import { Activity } from "lucide-react";

const FisioPlayLogo = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-button">
      <Activity className="h-6 w-6 text-primary-foreground" />
    </div>
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Fisio <span className="text-primary">Play</span>
      </h1>
    </div>
  </div>
);

export default FisioPlayLogo;
