import { Avatar } from '@base-ui/react/avatar'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// Tracking the image with a single `errored` flag missed the cases that matter:
// a cached image that is already complete before React attaches `onError`, and
// a `src` that changes to a broken one after a good one has loaded. Base UI
// tracks the loading status instead, and swaps the fallback in from that.

export type LiquidAvatarProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  alt?: string
  fallback?: ReactNode
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  src?: string
  tint?: string
}

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export const LiquidAvatar = forwardRef<HTMLSpanElement, LiquidAvatarProps>(({
  alt,
  className,
  fallback,
  name,
  size = 'md',
  src,
  style,
  styles,
  tint,
  ...props
}, ref) => {
  const root = useLiquidStyles('lq-avatar', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-avatar-tint': tint } : undefined,
  })

  return (
    <Avatar.Root
      className={root.className}
      data-liquid-size={size}
      ref={ref}
      style={root.style}
      title={name}
      {...props}
    >
      {src && <Avatar.Image alt={alt ?? name ?? ''} src={src} />}
      <Avatar.Fallback
        aria-label={name}
        className="lq-avatar__fallback"
        role={name ? 'img' : undefined}
      >
        {fallback ?? (name ? getInitials(name) : '•')}
      </Avatar.Fallback>
    </Avatar.Root>
  )
})

LiquidAvatar.displayName = 'LiquidAvatar'

export type LiquidAvatarGroupProps = HTMLAttributes<HTMLSpanElement> & LiquidStyleProps & {
  children: ReactNode
  max?: number
  size?: LiquidAvatarProps['size']
  total?: number
}

export const LiquidAvatarGroup = forwardRef<HTMLSpanElement, LiquidAvatarGroupProps>(({
  children,
  className,
  max,
  size = 'md',
  style,
  styles,
  total,
  ...props
}, ref) => {
  const items = Array.isArray(children) ? children : [children]
  const visible = max ? items.slice(0, max) : items
  const overflow = (total ?? items.length) - visible.length
  const root = useLiquidStyles('lq-avatar-group', { className, style, styles })

  return (
    <span className={root.className} ref={ref} style={root.style} {...props}>
      {visible}
      {overflow > 0 && (
        <span className="lq-avatar lq-avatar--overflow" data-liquid-size={size}>
          <span className="lq-avatar__fallback">+{overflow}</span>
        </span>
      )}
    </span>
  )
})

LiquidAvatarGroup.displayName = 'LiquidAvatarGroup'
