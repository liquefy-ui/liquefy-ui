import { Menu } from '@base-ui/react/menu'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useLiquefyPortalContainer } from './provider'
import { useLiquidStyles, type LiquidStyleProps } from './styles-prop'

// The previous version measured the trigger by hand, flipped the popup with a
// couple of thresholds and listened for outside pointerdown. None of it handled
// the keyboard: no arrow keys, no Home/End, no typeahead, no focus return.
// Base UI covers all of that, plus collision-aware positioning and the
// --available-height the popup now caps itself to.

export type LiquidMenuItemDef = {
  danger?: boolean
  disabled?: boolean
  icon?: ReactNode
  label: ReactNode
  onSelect?: () => void
  shortcut?: string
  type?: 'item'
} | {
  type: 'separator'
}

export type LiquidMenuProps = LiquidStyleProps & {
  align?: 'start' | 'end'
  className?: string
  items: LiquidMenuItemDef[]
  style?: CSSProperties
  trigger: ReactElement<Record<string, unknown>>
}

export const LiquidMenu = ({ align = 'start', className, items, style, styles, trigger }: LiquidMenuProps) => {
  const portalContainer = useLiquefyPortalContainer()
  // The anchor span stays the layout box, so className/style/styles keep meaning
  // what they did before the popup moved into a portal.
  const root = useLiquidStyles('lq-menu', { className, style, styles })

  return (
    <span className={root.className} style={root.style}>
      <Menu.Root>
        <Menu.Trigger render={trigger} />
        <Menu.Portal container={portalContainer ?? undefined}>
          <Menu.Positioner align={align} className="lq-menu__positioner" side="bottom" sideOffset={7}>
            <Menu.Popup className="lq-menu__popup lq-popover">
              {items.map((item, index) => item.type === 'separator'
                ? <Menu.Separator className="lq-menu__separator" key={`separator-${index}`} />
                : (
                  <Menu.Item
                    className="lq-menu__item"
                    data-danger={item.danger}
                    disabled={item.disabled}
                    key={index}
                    // Typeahead matches on this, so give it the text when we have it.
                    label={typeof item.label === 'string' ? item.label : undefined}
                    onClick={() => item.onSelect?.()}
                  >
                    {item.icon && <span className="lq-menu__icon">{item.icon}</span>}
                    <span className="lq-menu__label">{item.label}</span>
                    {item.shortcut && <kbd className="lq-menu__shortcut">{item.shortcut}</kbd>}
                  </Menu.Item>
                ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </span>
  )
}
