import { useState, type CSSProperties } from 'react'
import { CopyIcon, DownloadIcon, EyeIcon, HeartIcon, LinkIcon, ShareIcon, TrashIcon } from '@liquefy-ui/icons'
import { LiquidContextMenu, type ContextMenuSide, type LiquidContextMenuItem } from '@liquefy-ui/lab'
import { LiquidSegmented } from '@liquefy-ui/react'
import { LabControl, LabControls } from '../controls'
import { LabStage, type LabScene } from '../stage'
import type { LabExperiment } from '../types'

const SIDES = [
  { label: 'Auto', value: 'auto' },
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
] as const satisfies readonly { label: string; value: ContextMenuSide | 'auto' }[]

const PHOTO: CSSProperties = {
  borderRadius: 18,
  display: 'block',
  height: 160,
  objectFit: 'cover',
  width: 240,
}

const THUMB: CSSProperties = {
  aspectRatio: '1',
  borderRadius: 18,
  display: 'block',
  objectFit: 'cover',
  width: 'min(24vw, 104px)',
}

/** The actions on a photo, reporting which one was chosen. */
const photoActions = (onChoose: (label: string) => void): LiquidContextMenuItem[] => [
  { icon: <ShareIcon size={18} />, label: 'Share', onSelect: () => onChoose('Share') },
  { icon: <CopyIcon size={18} />, label: 'Copy', onSelect: () => onChoose('Copy') },
  { icon: <HeartIcon size={18} />, label: 'Favourite', onSelect: () => onChoose('Favourite') },
  { icon: <DownloadIcon size={18} />, label: 'Save to Files', onSelect: () => onChoose('Save to Files') },
  { danger: true, icon: <TrashIcon size={18} />, label: 'Delete', onSelect: () => onChoose('Delete') },
]

const Playground = () => {
  const [side, setSide] = useState<ContextMenuSide | 'auto'>('auto')
  const [chosen, setChosen] = useState<string | null>(null)

  return (
    <>
      <LabStage height={360}>
        <LiquidContextMenu items={photoActions(setChosen)} label="Photo" side={side}>
          <img alt="The coast at dusk" draggable={false} src="/scenes/coast.jpg" style={PHOTO} />
        </LiquidContextMenu>
      </LabStage>
      <LabControls>
        <LabControl label="Side">
          <LiquidSegmented
            label="Side"
            onValueChange={(value) => setSide(value as ContextMenuSide | 'auto')}
            options={[...SIDES]}
            size="sm"
            value={side}
          />
        </LabControl>
        <LabControl label="Last chosen">
          <span>{chosen ?? 'Nothing yet'}</span>
        </LabControl>
      </LabControls>
    </>
  )
}

const GALLERY: { alt: string; scene: LabScene }[] = [
  { alt: 'The coast at dusk', scene: 'coast' },
  { alt: 'A fjord under cloud', scene: 'fjord' },
  { alt: 'A summit above the clouds', scene: 'summit' },
]

const Gallery = () => (
  <LabStage height={300} scene="summit">
    <div style={{ display: 'flex', gap: 12 }}>
      {GALLERY.map((photo) => (
        <LiquidContextMenu
          items={[
            { icon: <EyeIcon size={18} />, label: 'Open' },
            { icon: <LinkIcon size={18} />, label: 'Copy link' },
            { icon: <HeartIcon size={18} />, label: 'Favourite' },
            { danger: true, icon: <TrashIcon size={18} />, label: 'Delete' },
          ]}
          key={photo.scene}
          label={photo.alt}
          width={220}
        >
          <img alt={photo.alt} draggable={false} src={`/scenes/${photo.scene}.jpg`} style={THUMB} />
        </LiquidContextMenu>
      ))}
    </div>
  </LabStage>
)

export const experiment: LabExperiment = {
  category: 'menus',
  demos: [
    {
      code: `import { CopyIcon, DownloadIcon, HeartIcon, ShareIcon, TrashIcon } from '@liquefy-ui/icons'
import { LiquidContextMenu } from '@liquefy-ui/lab'

<LiquidContextMenu
  label="Photo"
  items={[
    { icon: <ShareIcon size={18} />, label: 'Share', onSelect: share },
    { icon: <CopyIcon size={18} />, label: 'Copy', onSelect: copy },
    { icon: <HeartIcon size={18} />, label: 'Favourite', onSelect: favourite },
    { icon: <DownloadIcon size={18} />, label: 'Save to Files', onSelect: save },
    { icon: <TrashIcon size={18} />, label: 'Delete', onSelect: remove, danger: true },
  ]}
>
  <img alt="The coast at dusk" src="/coast.jpg" draggable={false} />
</LiquidContextMenu>`,
      description: 'Press and hold the photo — or right-click it, or focus it and press Shift+F10. It sinks a little while you hold, then lifts off the page as the menu buds out from under its edge. Keep your finger down and slide: the highlight follows, and letting go on a row chooses it. Let go off the menu to close it; let go without moving and it stays open for a tap.',
      render: () => <Playground />,
      title: 'Hold a photo',
    },
    {
      code: `import { EyeIcon, HeartIcon, LinkIcon, TrashIcon } from '@liquefy-ui/icons'
import { LiquidContextMenu } from '@liquefy-ui/lab'

{photos.map((photo) => (
  <LiquidContextMenu
    key={photo.id}
    label={photo.alt}
    width={220}
    items={[
      { icon: <EyeIcon size={18} />, label: 'Open', onSelect: () => open(photo) },
      { icon: <LinkIcon size={18} />, label: 'Copy link', onSelect: () => copyLink(photo) },
      { icon: <HeartIcon size={18} />, label: 'Favourite', onSelect: () => favourite(photo) },
      { icon: <TrashIcon size={18} />, label: 'Delete', onSelect: () => remove(photo), danger: true },
    ]}
  >
    <img alt={photo.alt} src={photo.src} draggable={false} />
  </LiquidContextMenu>
))}`,
      description: 'Each thumbnail has its own menu. The menu goes below the photo when it fits there, above it when it does not, and lines up with whichever end of the photo is nearer the middle of the screen; a photo with no room around it moves to make some.',
      render: () => <Gallery />,
      title: 'A row of thumbnails',
    },
  ],
  description:
    'A context menu in the manner of iOS, made of liquid glass. A long press lifts what was pressed off the page over a darkening scrim, and the menu buds out from under its edge — a drop of glass that pulls a neck out of the preview, spreads, drops into a panel and swings past its shape — with its rows arriving one at a time. Slide and let go to choose, as on iOS.',
  importLine: "import { LiquidContextMenu } from '@liquefy-ui/lab'",
  inspiredBy: 'iOS context menus',
  name: 'LiquidContextMenu',
  order: 2,
  package: '@liquefy-ui/lab',
  preview: () => (
    <LabStage height={178}>
      <img alt="" draggable={false} src="/scenes/coast.jpg" style={{ ...PHOTO, height: 104, width: 156 }} />
    </LabStage>
  ),
  props: [
    { description: 'What is pressed: a photo, a card, a message. It lifts off the page while the menu is open.', name: 'children', required: true, type: 'ReactNode' },
    { description: 'Each row’s label is its accessible name and what typeahead matches; an icon sits at its end. onSelect runs once the chosen row has popped, just before the menu closes. danger draws it in red.', name: 'items', required: true, type: 'LiquidContextMenuItem[]' },
    { description: 'The menu’s accessible name.', name: 'label', type: 'string' },
    { defaultValue: '450', description: 'Milliseconds a finger or pen has to rest on it before the menu opens. A mouse opens it with a right click.', name: 'delay', type: 'number' },
    { defaultValue: "'auto'", description: 'Which side of the preview the menu comes out of. auto is below, then above, then beside — whichever fits without moving the preview, or else the one that moves it least.', name: 'side', type: "'auto' | 'top' | 'bottom' | 'left' | 'right'" },
    { defaultValue: '240', description: 'The menu’s width in pixels. Each row is 44px tall.', name: 'width', type: 'number' },
    { description: 'What lifts off the page while the menu is open, if not a second copy of children.', name: 'preview', type: 'ReactNode' },
    { defaultValue: '18', description: 'Corner radius of the lifted preview, which is cut to it.', name: 'radius', type: 'number' },
    { defaultValue: '45', description: 'Milliseconds between one row arriving and the next.', name: 'stagger', type: 'number' },
    { description: 'Called with true as the menu opens and false as it starts to close.', name: 'onOpenChange', type: '(open: boolean) => void' },
    { description: 'Ignores presses, right clicks and the keyboard.', name: 'disabled', type: 'boolean' },
    { description: 'A colour mixed into the glass.', name: 'tint', type: 'string' },
  ],
  slug: 'liquid-context-menu',
}
