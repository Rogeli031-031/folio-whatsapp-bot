import { DirectorIaDisabled } from "@/modules/director-ia/components/DirectorIaDisabled";
import { DirectorIaShell } from "@/modules/director-ia/components/DirectorIaShell";
import { isDirectorIaEnabled } from "@/modules/director-ia/lib/is-enabled";

export default function DirectorIaPage() {
  if (!isDirectorIaEnabled()) {
    return <DirectorIaDisabled />;
  }
  return <DirectorIaShell />;
}
