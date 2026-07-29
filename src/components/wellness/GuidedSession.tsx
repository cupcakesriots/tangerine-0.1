import { BoxBreathingCoach } from "./BoxBreathingCoach";
import { DeskDecompress } from "./DeskDecompress";
import { SomaticGrounding } from "./SomaticGrounding";
import { BrainDump } from "./BrainDump";
import { EnergyReset } from "./EnergyReset";
import { EveningWindDown } from "./EveningWindDown";

export type SessionType = "box-breathing" | "desk-decompress" | "somatic-grounding" | "brain-dump" | "energy-reset" | "evening-wind-down";

interface Props {
  type: SessionType;
  onComplete: () => void;
  onExit: () => void;
}

export function GuidedSession({ type, onComplete, onExit }: Props) {
  switch (type) {
    case "box-breathing": return <BoxBreathingCoach onComplete={onComplete} onExit={onExit} />;
    case "desk-decompress": return <DeskDecompress onComplete={onComplete} onExit={onExit} />;
    case "somatic-grounding": return <SomaticGrounding onComplete={onComplete} onExit={onExit} />;
    case "brain-dump": return <BrainDump onComplete={onComplete} onExit={onExit} />;
    case "energy-reset": return <EnergyReset onComplete={onComplete} onExit={onExit} />;
    case "evening-wind-down": return <EveningWindDown onComplete={onComplete} onExit={onExit} />;
    default: return null;
  }
}
