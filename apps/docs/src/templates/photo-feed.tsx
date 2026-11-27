import { HeartIcon, PinIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidAvatar, LiquidButton, LiquidIconButton, LiquidSegmented, LiquidTextField } from '@liquefy-ui/react'
import { useState, type FormEvent } from 'react'
import { paneGlass } from './template-theme'

const posts = [
  { id: 'coast', author: 'Stefan Kunze', title: 'The last light on the coast', alt: 'Sunlit cliffs above the sea' },
  { id: 'fjord', author: 'Alexey Topolyanskiy', title: 'Looking down into the fjord', alt: 'A deep blue fjord between rocky mountains' },
  { id: 'summit', author: 'Wolfgang Lutz', title: 'Camp beneath the summit', alt: 'Yellow tents beneath snowy peaks' },
]

type Reaction = { liked: boolean; saved: boolean; comments: { id: string; text: string }[] }
const emptyReaction: Reaction = { liked: false, saved: false, comments: [] }
const feedFilters = [{ label: 'Feed', value: 'feed' }, { label: 'Saved', value: 'saved' }]

const Post = ({ post, reaction, onChange }: {
  post: (typeof posts)[number]
  reaction: Reaction
  onChange: (update: (previous: Reaction) => Reaction) => void
}) => {
  const [showComments, setShowComments] = useState(false)
  const [draft, setDraft] = useState('')
  const publish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    const comment = { id: crypto.randomUUID(), text }
    onChange((previous) => ({ ...previous, comments: [...previous.comments, comment] }))
    setDraft('')
  }

  return (
    <article aria-label={post.title}>
      <GlassCard className="feed-post" interactive={false} styles={paneGlass}>
        <header className="feed-post__header">
          <LiquidAvatar aria-hidden="true" name={post.author} />
          <strong>{post.author}</strong>
        </header>
        <img alt={post.alt} className="feed-post__photo" height={900} loading={post.id === 'coast' ? 'eager' : 'lazy'} src={`/scenes/${post.id}.jpg`} width={1600} />
        <div className="feed-post__body">
          <div className="demo-actions">
            <LiquidIconButton aria-pressed={reaction.liked} label="Like post" onClick={() => onChange((previous) => ({ ...previous, liked: !previous.liked }))}>
              <HeartIcon size={19} />
            </LiquidIconButton>
            <LiquidButton aria-expanded={showComments} onClick={() => setShowComments(!showComments)}>
              Comments ({reaction.comments.length})
            </LiquidButton>
            <LiquidIconButton aria-pressed={reaction.saved} className="feed-post__save" label="Save post" onClick={() => onChange((previous) => ({ ...previous, saved: !previous.saved }))}>
              <PinIcon size={19} />
            </LiquidIconButton>
          </div>
          <h2>{post.title}</h2>
          {showComments && (
            <div className="feed-post__comments">
              {reaction.comments.length > 0 && (
                <ul className="demo-list">
                  {reaction.comments.map(({ id, text }) => <li key={id}>{text}</li>)}
                </ul>
              )}
              <form className="demo-inline-form" onSubmit={publish}>
                <LiquidTextField aria-label="Write a comment" maxLength={240} onChange={(event) => setDraft(event.currentTarget.value)} placeholder="Write a comment" value={draft} />
                <LiquidButton disabled={!draft.trim()} type="submit">Post</LiquidButton>
              </form>
            </div>
          )}
        </div>
      </GlassCard>
    </article>
  )
}

export const PhotoFeed = () => {
  const [filter, setFilter] = useState('feed')
  const [reactions, setReactions] = useState<Record<string, Reaction>>({})
  const savedPosts = posts.filter(({ id }) => reactions[id]?.saved)
  const visible = filter === 'saved' ? savedPosts : posts

  return (
    <div className="demo-stack">
      <LiquidSegmented className="demo-switcher" label="Photo collection" onValueChange={setFilter} options={feedFilters} value={filter} />
      <div className="feed-layout">
        <div className="demo-stack">
          {visible.length === 0 && <p className="demo-empty">No saved photos yet.</p>}
          {visible.map((post) => (
            <Post
              key={post.id}
              onChange={(change) => setReactions((current) => ({ ...current, [post.id]: change(current[post.id] ?? emptyReaction) }))}
              post={post}
              reaction={reactions[post.id] ?? emptyReaction}
            />
          ))}
        </div>
        <aside className="feed-credits">
          <h2>Photographers</h2>
          <ul className="demo-list">
            {posts.map(({ id, author }) => (
              <li key={id}><LiquidAvatar aria-hidden="true" name={author} size="sm" />{author}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
