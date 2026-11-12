// Reviewed V1 candidate policy: no non-essential analytics, regardless of legacy preferences.
// No storage reads, tag injection, consent event or network request may override this.
export const NON_ESSENTIAL_ANALYTICS_ENABLED=false;
export function track(){return false;}
export function loadGTM(){return false;}
