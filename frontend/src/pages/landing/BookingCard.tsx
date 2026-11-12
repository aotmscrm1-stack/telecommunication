import { useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2Icon,
  Clock3Icon,
  Loader2Icon,
  ShieldCheckIcon,
  VideoIcon,
} from 'lucide-react';
import { ContactCard } from '@/components/ui/contact-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { demoBookingsAPI } from '@/services/api';

const MOBILE_RE = /^[6-9]\d{9}$/;
const pad = (n: number) => String(n).padStart(2, '0');

const toLocalInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const prettySchedule = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

type FormState = {
  name: string;
  mobile: string;
  scheduledAt: string;
  message: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { name: '', mobile: '', scheduledAt: '', message: '' };

// Frosted-glass field styling for the dark hero card
const FIELD_BASE =
  'bg-white/5 border-white/15 text-white placeholder:text-white/35 focus-visible:ring-white/25 focus-visible:ring-offset-0 [color-scheme:dark]';
const FIELD_INVALID = 'border-destructive focus-visible:ring-destructive/40';

/**
 * "Book a free demo" — the landing page conversion form, built on <ContactCard />.
 * Every field is mandatory; posts to POST /api/demo-bookings.
 */
export function BookingCard() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<{ name: string; scheduledAt: string } | null>(null);

  const minSchedule = useMemo(() => toLocalInput(new Date()), []);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError('');
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!MOBILE_RE.test(form.mobile)) {
      next.mobile = 'Enter a valid 10-digit mobile number (starts with 6-9).';
    }
    if (!form.scheduledAt) {
      next.scheduledAt = 'Pick a date and time for your demo.';
    } else if (new Date(form.scheduledAt).getTime() < Date.now() - 60 * 1000) {
      next.scheduledAt = 'Please choose a future date and time.';
    }
    if (form.message.trim().length < 5) {
      next.message = 'Tell us what you want to see (min 5 characters).';
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      const response = await demoBookingsAPI.create({
        name: form.name.trim(),
        mobile: form.mobile,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        message: form.message.trim(),
        source: 'landing-page',
      });
      const payload = response?.data?.data;
      setBooked({
        name: payload?.name || form.name.trim(),
        scheduledAt: payload?.scheduledAt || new Date(form.scheduledAt).toISOString(),
      });
      setForm(EMPTY_FORM);
    } catch (error: any) {
      const body = error?.response?.data;
      if (body?.errors && typeof body.errors === 'object') setErrors(body.errors);
      setServerError(body?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const errorInput = (key: keyof FormState) => cn(FIELD_BASE, errors[key] && FIELD_INVALID);

  return (
    <ContactCard
      variant="glass"
      title="Book a free demo"
      description="Pick a slot and we will walk you through the CRM, the AI telecaller and the WhatsApp automation — on your own pipeline. Every field below is required."
      contactInfo={[
        { icon: Clock3Icon, label: 'Duration', value: '30-minute walkthrough' },
        { icon: VideoIcon, label: 'Format', value: 'Google Meet or Zoom' },
        { icon: ShieldCheckIcon, label: 'Cost', value: 'Free · No credit card' },
      ]}
    >
      <div className="w-full">
        {booked ? (
          /* ── SUCCESS ─────────────────────────────────────────── */
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <CheckCircle2Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold leading-tight">
                  Thank you, {booked.name}!
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  Slot requested for{' '}
                  <span className="font-medium text-white">
                    {prettySchedule(booked.scheduledAt)}
                  </span>
                  . You are on our priority callback list.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/70">
              <Clock3Icon className="h-3.5 w-3.5 shrink-0 text-white/60" />
              Average response time: under 30 minutes on business days.
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => setBooked(null)}
            >
              Book another demo
            </Button>
          </div>
        ) : (
          /* ── FORM ────────────────────────────────────────────── */
          <>
            <div className="mb-4">
              <h2 className="text-base font-semibold leading-tight text-white">Reserve your slot</h2>
              <p className="mt-1 text-xs text-white/60">
                We call to confirm within 30 minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bk-name">Full Name</Label>
                <Input
                  id="bk-name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={errorInput('name')}
                />
                {errors.name && (
                  <p className="text-destructive text-xs font-medium">{errors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bk-mobile">Mobile Number</Label>
                <Input
                  id="bk-mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={errorInput('mobile')}
                />
                {errors.mobile ? (
                  <p className="text-destructive text-xs font-medium">{errors.mobile}</p>
                ) : (
                  <p className="text-xs text-white/55">10 digits, no country code</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bk-schedule">Preferred Date &amp; Time</Label>
                <Input
                  id="bk-schedule"
                  type="datetime-local"
                  min={minSchedule}
                  value={form.scheduledAt}
                  onChange={(e) => setField('scheduledAt', e.target.value)}
                  className={errorInput('scheduledAt')}
                />
                {errors.scheduledAt && (
                  <p className="text-destructive text-xs font-medium">{errors.scheduledAt}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="bk-message">Message / Description</Label>
                <Textarea
                  id="bk-message"
                  rows={3}
                  maxLength={1000}
                  placeholder="Your team size, call volume, what you want to see…"
                  value={form.message}
                  onChange={(e) => setField('message', e.target.value)}
                  className={errorInput('message')}
                />
                {errors.message && (
                  <p className="text-destructive text-xs font-medium">{errors.message}</p>
                )}
              </div>

              {serverError && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs font-medium">
                  {serverError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Booking your slot…
                  </>
                ) : (
                  'Book Free Demo'
                )}
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-white/55">
                All fields required · Confirmed in 30 minutes · No credit card
              </p>
            </form>
          </>
        )}
      </div>
    </ContactCard>
  );
}

export default BookingCard;
