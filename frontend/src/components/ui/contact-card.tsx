import React from 'react';
import { cn } from '@/lib/utils';
import { PlusIcon, type LucideIcon } from 'lucide-react';

type ContactInfoProps = React.ComponentProps<'div'> & {
  icon: LucideIcon;
  label: string;
  value: string;
  glass?: boolean;
};

type ContactCardProps = React.ComponentProps<'div'> & {
  // Content props
  title?: string;
  description?: string;
  contactInfo?: ContactInfoProps[];
  formSectionClassName?: string;
  /** `glass` = translucent frosted panel for dark backgrounds. */
  variant?: 'default' | 'glass';
};

export function ContactCard({
  title = 'Contact With Us',
  description = 'If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day.',
  contactInfo,
  className,
  formSectionClassName,
  variant = 'default',
  children,
  ...props
}: ContactCardProps) {
  const glass = variant === 'glass';

  return (
    <div
      className={cn(
        'relative grid h-full w-full border md:grid-cols-2 lg:grid-cols-3',
        glass
          ? 'rounded-[26px] border-white/15 bg-white/[0.06] text-white shadow-[0_34px_90px_-30px_rgba(3,8,20,0.85)] backdrop-blur-2xl'
          : 'bg-card shadow',
        className,
      )}
      {...props}
    >
      <PlusIcon className={cn('absolute -top-3 -left-3 h-6 w-6', glass ? 'text-white/35' : '')} />
      <PlusIcon className={cn('absolute -top-3 -right-3 h-6 w-6', glass ? 'text-white/35' : '')} />
      <PlusIcon className={cn('absolute -bottom-3 -left-3 h-6 w-6', glass ? 'text-white/35' : '')} />
      <PlusIcon className={cn('absolute -right-3 -bottom-3 h-6 w-6', glass ? 'text-white/35' : '')} />
      <div className="flex flex-col justify-between lg:col-span-2">
        <div className="relative h-full space-y-4 px-4 py-8 md:p-8">
          <h2
            className={cn(
              'text-3xl font-bold md:text-4xl lg:text-5xl',
              glass ? 'text-white' : '',
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              'max-w-xl text-sm md:text-base lg:text-lg',
              glass ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            {description}
          </p>
          <div className="grid gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
            {contactInfo?.map((info, index) => (
              <ContactInfo key={index} glass={glass} {...info} />
            ))}
          </div>
        </div>
      </div>
      <div
        className={cn(
          'flex h-full w-full items-center border-t p-5 md:col-span-1 md:border-t-0 md:border-l',
          glass ? 'border-white/10 bg-white/[0.04]' : 'bg-muted/40',
          formSectionClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ContactInfo({
  icon: Icon,
  label,
  value,
  glass,
  className,
  ...props
}: ContactInfoProps) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)} {...props}>
      <div className={cn('rounded-lg p-3', glass ? 'bg-white/10' : 'bg-muted/40')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={cn('font-medium', glass ? 'text-white' : '')}>{label}</p>
        <p className={cn('text-xs', glass ? 'text-white/60' : 'text-muted-foreground')}>{value}</p>
      </div>
    </div>
  );
}
