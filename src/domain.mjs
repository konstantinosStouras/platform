export const DEFAULT_SIDES = ['Hosts', 'Guests'];
export const MAX_SIDES = 8;
export const STATUSES = ['lobby', 'active', 'paused', 'closed'];
export function normalizeCode(value) { return String(value || '').toUpperCase().replace(/[\s-]/g, ''); }
export function validateSession(input) {
  const title = String(input.title || '').trim();
  const sides = (input.sides || DEFAULT_SIDES).map(s => String(s).trim());
  if (!title || title.length > 100) throw new Error('Give your session a name (up to 100 characters).');
  if (sides.length < 2 || sides.length > MAX_SIDES) throw new Error('A platform needs between two and eight sides.');
  if (sides.some(s => !s || s.length > 40)) throw new Error('Name every side using 1–40 characters.');
  if (new Set(sides.map(s => s.toLowerCase())).size !== sides.length) throw new Error('Each platform side needs a different name.');
  const description = String(input.description || '').trim();
  if (description.length > 1000) throw new Error('Keep the session instructions under 1,000 characters.');
  if (!['class', 'test'].includes(input.mode)) throw new Error('Choose a class or test session.');
  return {title, sides, description, mode: input.mode};
}
export function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), n => alphabet[n % alphabet.length]).join('');
}
export function canTransition(from, to) {
  return ({lobby:['active','closed'], active:['paused','closed'], paused:['active','closed'], closed:[]}[from] || []).includes(to);
}
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
