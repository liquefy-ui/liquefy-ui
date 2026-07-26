import type { ReactElement, SVGProps } from 'react'

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number }

const Glyph = ({ children, size = 16, ...props }: GlyphProps): ReactElement => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {children}
  </svg>
)

export const CheckGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="m5 12.5 4.3 4.2L19 7" /></Glyph>
)

export const MinusGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="M5.5 12h13" /></Glyph>
)

export const XGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></Glyph>
)

export const ChevronDownGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="m6.5 9.5 5.5 5 5.5-5" /></Glyph>
)

export const ChevronLeftGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="M14.5 6.5 9.5 12l5 5.5" /></Glyph>
)

export const ChevronRightGlyph = (props: GlyphProps): ReactElement => (
  <Glyph {...props}><path d="m9.5 6.5 5 5.5-5 5.5" /></Glyph>
)

export const StarGlyph = ({ size = 16, ...props }: GlyphProps): ReactElement => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height={size}
    stroke="currentColor"
    strokeLinejoin="round"
    strokeWidth={1.4}
    viewBox="0 0 24 24"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="m12 3.6 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7L12 3.6Z" />
  </svg>
)

export const InfoGlyph = (props: GlyphProps): ReactElement => (
  <Glyph strokeWidth={1.8} {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 11.5V16M12 8.2v.1" /></Glyph>
)

export const SuccessGlyph = (props: GlyphProps): ReactElement => (
  <Glyph strokeWidth={1.8} {...props}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.5 2.4 4.6-5" /></Glyph>
)

export const WarningGlyph = (props: GlyphProps): ReactElement => (
  <Glyph strokeWidth={1.8} {...props}>
    <path d="M10.2 4.6 2.9 17.3a2.1 2.1 0 0 0 1.8 3.2h14.6a2.1 2.1 0 0 0 1.8-3.2L13.8 4.6a2.1 2.1 0 0 0-3.6 0Z" />
    <path d="M12 9.5v4.2M12 17.2v.1" />
  </Glyph>
)

export const DangerGlyph = (props: GlyphProps): ReactElement => (
  <Glyph strokeWidth={1.8} {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5M12 15.8v.1" /></Glyph>
)
