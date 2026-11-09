import type { Finding } from '../detectors/types';

export type Category = 'network' | 'contact' | 'secret' | 'layout' | 'thai' | 'visual' | 'manual';

type Info = { name: string; why: string; category: Category };

/** Plain-language names and reasons for every finding type a detector can emit. */
const INFO: Record<string, Info> = {
  ip: { name: 'Public IP address', why: 'Can identify who owns or runs the network.', category: 'network' },
  'internal-ip': { name: 'Internal IP address', why: 'Reveals private network layout (10.x, 172.16-31.x, 192.168.x).', category: 'network' },
  ipv6: { name: 'IPv6 address', why: 'Can identify a device or network.', category: 'network' },
  url: { name: 'Internal URL', why: 'Points at a private or internal service.', category: 'network' },
  hostname: { name: 'Internal hostname', why: 'Names a machine on a private network (.internal, .local, .corp ...).', category: 'network' },
  email: { name: 'Email address', why: 'Identifies a person or organisation.', category: 'contact' },
  phone: { name: 'Phone number', why: 'Personal contact detail.', category: 'contact' },
  token: { name: 'Secret / API token', why: 'Anyone who sees it can use it to sign in or call an API.', category: 'secret' },
  column: { name: 'Whole table column', why: 'Its header (e.g. "Source IP", "Username") says every value below is sensitive, even if no pattern matched.', category: 'layout' },
  'thai-id': { name: 'Thai national ID', why: '13 digits that pass the official check-digit test.', category: 'thai' },
  'thai-phone': { name: 'Thai phone number', why: 'Personal contact detail.', category: 'thai' },
  'thai-student-id': { name: 'Student ID', why: 'Follows a "student ID" label, identifies a person.', category: 'thai' },
  'thai-name': { name: 'Thai name', why: 'Best-effort guess from a title such as นาย/นาง/นางสาว. Check it.', category: 'thai' },
  face: { name: 'Face', why: 'Detected by an on-device face model.', category: 'visual' },
  qr: { name: 'QR code', why: 'Can hide a link, login or payment.', category: 'visual' },
  manual: { name: 'Box you drew', why: 'Added by hand.', category: 'manual' },
};

export const CATEGORY_COLOR: Record<Category, string> = {
  network: '#f59e0b',
  contact: '#3b82f6',
  secret: '#ef4444',
  layout: '#a855f7',
  thai: '#14b8a6',
  visual: '#ec4899',
  manual: '#64748b',
};

export const CATEGORY_NAME: Record<Category, string> = {
  network: 'Network',
  contact: 'Contact',
  secret: 'Secrets',
  layout: 'Table columns',
  thai: 'Thai data',
  visual: 'Faces & QR',
  manual: 'Manual',
};

export function describe(f: Finding): Info & { color: string } {
  const info = INFO[f.type] ?? (f.source === 'manual' ? INFO.manual : { name: f.type, why: '', category: 'manual' as Category });
  return { ...info, color: CATEGORY_COLOR[info.category] };
}
