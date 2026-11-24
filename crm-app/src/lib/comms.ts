import type { MessageChannel } from '@/types';

/** Strips everything but digits and a leading +, which is what wa.me / sms: expect. */
export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(text)}`;
}

export function smsLink(phone: string, text: string): string {
  // iOS wants `&body=`, Android/most others accept `?body=` — `&` works on both.
  return `sms:${phone.replace(/\s+/g, '')}&body=${encodeURIComponent(text)}`;
}

export function mailLink(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const CHANNEL_LABEL: Record<MessageChannel, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};
