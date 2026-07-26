import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

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
  const [errored, setErrored] = useState(false)
  const showImage = src && !errored
  const root = useLiquidStyles('lq-avatar', {
    className,
    style,
    styles,
    vars: tint ? { '--lq-avatar-tint': tint } : undefined,
  })

  return (
    <span
      className={root.className}
      data-liquid-size={size}
      ref={ref}
      style={root.style}
      title={name}
      {...props}
    >
      {showImage
        ? <img alt={alt ?? name ?? ''} onError={() => setErrored(true)} src={src} />
        : <span aria-label={name} className="lq-avatar__fallback" role={name ? 'img' : undefined}>
            {fallback ?? (name ? getInitials(name) : '•')}
          </span>}
    </span>
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
