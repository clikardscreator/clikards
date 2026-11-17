/** Formate une durée en secondes en `m:ss.d` (ex. 83.4 → "1:23.4"). */
export function formaterTemps(secondes: number): string {
  if (!Number.isFinite(secondes) || secondes < 0) return '0:00.0';
  const minutes = Math.floor(secondes / 60);
  const reste = secondes - minutes * 60;
  const resteTexte = reste.toFixed(1).padStart(4, '0');
  return `${minutes}:${resteTexte}`;
}
