let locked = false;

export function lock() {
  locked = true;
}

export function unlock() {
  locked = false;
}

export function canRun() {
  return !locked;
}

export function resolveConflict(type: string, lastType?: string) {
  // hard rules
  if (lastType === "POPUNDER" && type === "SMARTLINK") return false;

  return true;
}
