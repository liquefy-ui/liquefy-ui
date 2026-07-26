import type { ReactElement, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number
}

type IconBaseProps = IconProps & {
  children: ReactElement | ReactElement[]
}

const IconBase = ({ children, size = 20, strokeWidth = 1.8, ...props }: IconBaseProps): ReactElement => {
  return (
    <svg
      aria-hidden={props['aria-label'] ? undefined : true}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
        {children}
      </g>
    </svg>
  )
}

export const ArrowRightIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </IconBase>
)

export const CheckIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m5 12.5 4.3 4.2L19 7" />
  </IconBase>
)

export const ChevronDownIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m6.5 9.5 5.5 5 5.5-5" />
  </IconBase>
)

export const CommandIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M9 7V5.5A2.5 2.5 0 1 0 6.5 8H17.5A2.5 2.5 0 1 0 15 5.5V18.5A2.5 2.5 0 1 0 17.5 16H6.5A2.5 2.5 0 1 0 9 18.5V7Z" />
  </IconBase>
)

export const ComponentsIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="7" rx="2" width="7" x="3" y="3" />
    <rect height="7" rx="2" width="7" x="14" y="3" />
    <rect height="7" rx="2" width="7" x="3" y="14" />
    <path d="M14 17.5h7M17.5 14v7" />
  </IconBase>
)

export const CopyIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="13" rx="3" width="13" x="8" y="8" />
    <path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2" />
  </IconBase>
)

export const GithubIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M15.8 21v-3.4c.1-1-.3-1.8-.9-2.3 3-.3 6.1-1.5 6.1-6.7 0-1.5-.5-2.7-1.4-3.7.1-.4.6-1.8-.2-3.7 0 0-1.1-.4-3.8 1.4a13 13 0 0 0-6.8 0C6.2.8 5.1 1.2 5.1 1.2c-.8 1.9-.3 3.3-.2 3.7A5.3 5.3 0 0 0 3.5 8.6c0 5.2 3.1 6.4 6.1 6.7-.5.4-.8 1-.9 1.7-.8.4-2.8 1-4-1.2-.8-1.4-2.3-1.5-2.3-1.5" />
    <path d="M8.7 20.8c-2.4.8-4.1-.8-4.1-.8" />
  </IconBase>
)

export const PauseIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M9 7v10M15 7v10" />
  </IconBase>
)

export const PlayIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m9 7 8 5-8 5V7Z" />
  </IconBase>
)

export const SearchIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m16 16 4 4" />
  </IconBase>
)

export const MoonIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M20 15.2A8.4 8.4 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
  </IconBase>
)

export const SparklesIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M12 3c.5 3.2 2.8 5.5 6 6-3.2.5-5.5 2.8-6 6-.5-3.2-2.8-5.5-6-6 3.2-.5 5.5-2.8 6-6Z" />
    <path d="M19 15.5c.2 1.3 1.2 2.3 2.5 2.5-1.3.2-2.3 1.2-2.5 2.5-.2-1.3-1.2-2.3-2.5-2.5 1.3-.2 2.3-1.2 2.5-2.5ZM5 15c.2 1 1 1.8 2 2-1 .2-1.8 1-2 2-.2-1-1-1.8-2-2 1-.2 1.8-1 2-2Z" />
  </IconBase>
)

export const SunIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </IconBase>
)

export const XIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </IconBase>
)

export const AlertTriangleIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M10.2 4.6 2.9 17.3a2.1 2.1 0 0 0 1.8 3.2h14.6a2.1 2.1 0 0 0 1.8-3.2L13.8 4.6a2.1 2.1 0 0 0-3.6 0Z" />
    <path d="M12 9.5v4.2M12 17.2v.1" />
  </IconBase>
)

export const BellIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M18.5 15.5c-1-1-1.5-2.2-1.5-4V9.4A5.2 5.2 0 0 0 12 4.2 5.2 5.2 0 0 0 7 9.4v2.1c0 1.8-.5 3-1.5 4-.6.6-.2 1.7.7 1.7h11.6c.9 0 1.3-1.1.7-1.7Z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </IconBase>
)

export const CalendarIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="16" rx="3" width="18" x="3" y="5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </IconBase>
)

export const ChevronLeftIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M14.5 6.5 9.5 12l5 5.5" />
  </IconBase>
)

export const ChevronRightIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m9.5 6.5 5 5.5-5 5.5" />
  </IconBase>
)

export const ChevronUpIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m6.5 14.5 5.5-5 5.5 5" />
  </IconBase>
)

export const CircleAlertIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4.5M12 15.8v.1" />
  </IconBase>
)

export const CircleCheckIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.5 2.4 4.6-5" />
  </IconBase>
)

export const ClockIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.2" />
  </IconBase>
)

export const DownloadIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
  </IconBase>
)

export const EyeIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </IconBase>
)

export const EyeOffIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M4 4.5 20 20M9.8 6.2A9.7 9.7 0 0 1 12 5.8c5.8 0 9.2 6.2 9.2 6.2a17 17 0 0 1-2.7 3.4M6 7.6A16.5 16.5 0 0 0 2.8 12S6.2 18.2 12 18.2c1.2 0 2.3-.3 3.3-.7" />
    <path d="M10 10.2a2.8 2.8 0 0 0 3.9 4" />
  </IconBase>
)

export const FilterIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M4 5.5h16l-6.2 7.2v5.2L10.2 20v-7.3L4 5.5Z" />
  </IconBase>
)

export const FolderIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M3.5 7a2.5 2.5 0 0 1 2.5-2.5h3.4c.7 0 1.4.3 1.9.9l1 1.1h6.2A2.5 2.5 0 0 1 21 9v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V7Z" />
  </IconBase>
)

export const HeartIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M12 20s-7.6-4.4-9-9.2C2.1 7.7 4 5 6.9 5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 2.9 0 4.8 2.7 3.9 5.8-1.4 4.8-9 9.2-9 9.2Z" />
  </IconBase>
)

export const HomeIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m4 10.5 8-6.8 8 6.8V19a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19v-8.5Z" />
    <path d="M9.5 20.5v-6h5v6" />
  </IconBase>
)

export const ImageIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="16" rx="3" width="18" x="3" y="4" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m5 17 4.5-4.3 3.4 3.2 2.9-2.7L21 17.4" />
  </IconBase>
)

export const InfoIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11.5V16M12 8.2v.1" />
  </IconBase>
)

export const LinkIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M9.5 14.5 14.5 9.5M8 12l-2.4 2.4a3.6 3.6 0 1 0 5 5L13 17M11 7l2.4-2.4a3.6 3.6 0 1 1 5 5L16 12" />
  </IconBase>
)

export const LockIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="9.5" rx="2.5" width="14" x="5" y="10.5" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
  </IconBase>
)

export const MailIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <rect height="14" rx="3" width="18" x="3" y="5" />
    <path d="m4 7.5 8 6 8-6" />
  </IconBase>
)

export const MinusIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M5.5 12h13" />
  </IconBase>
)

export const MoreHorizontalIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M5.5 12h.1M12 12h.1M18.5 12h.1" />
  </IconBase>
)

export const PlusIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M12 5.5v13M5.5 12h13" />
  </IconBase>
)

export const SettingsIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8 13.9 5l2.8-.7 1 2.7 2.9.6-.6 2.8 2 2.1-2 2.1.6 2.8-2.9.6-1 2.7-2.8-.7-1.9 2.2-1.9-2.2-2.8.7-1-2.7-2.9-.6.6-2.8-2-2.1 2-2.1L4.4 7l2.9-.6 1-2.7 2.8.7L12 2.8Z" />
  </IconBase>
)

export const ShareIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="17.5" cy="5.5" r="2.6" />
    <circle cx="17.5" cy="18.5" r="2.6" />
    <path d="m8.4 10.8 6.8-4M8.4 13.2l6.8 4" />
  </IconBase>
)

export const StarIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="m12 3.6 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6-4.2-3.9 5.7-.7L12 3.6Z" />
  </IconBase>
)

export const TrashIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M4.5 6.5h15M9.5 6V4.8A1.8 1.8 0 0 1 11.3 3h1.4a1.8 1.8 0 0 1 1.8 1.8V6M6.2 6.5l.8 12A2.2 2.2 0 0 0 9.2 20.5h5.6a2.2 2.2 0 0 0 2.2-2l.8-12" />
    <path d="M10 10.5v6M14 10.5v6" />
  </IconBase>
)

export const UploadIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <path d="M12 15V4.5M7.5 9 12 4.5 16.5 9M4.5 19.5h15" />
  </IconBase>
)

export const UserIcon = (props: IconProps): ReactElement => (
  <IconBase {...props}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.2c1.2-3.3 4-5 7.5-5s6.3 1.7 7.5 5" />
  </IconBase>
)
