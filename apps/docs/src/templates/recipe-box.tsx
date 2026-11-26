import { ClockIcon, ListIcon, MinusIcon, PlusIcon, SearchIcon, StarIcon } from '@liquefy-ui/icons'
import { GlassCard, LiquidButton, LiquidIconButton, LiquidSegmented, LiquidTextField } from '@liquefy-ui/react'
import { useState } from 'react'
import { usePreviewState } from './preview-state'
import { PreviewStatus } from './preview-status'
import { paneGlass } from './template-theme'

type Recipe = {
  id: string; title: string; minutes: number
  ingredients: { amount: number; unit: string; name: string }[]
  steps: string[]
}

const recipes: Recipe[] = [
  {
    id: 'beans', title: 'Lemon butter beans', minutes: 20,
    ingredients: [
      { amount: 1, unit: 'can', name: 'butter beans, drained' },
      { amount: 2, unit: 'tbsp', name: 'olive oil' },
      { amount: 2, unit: 'cloves', name: 'garlic, sliced' },
      { amount: 0.5, unit: '', name: 'lemon, juiced' },
      { amount: 60, unit: 'g', name: 'baby spinach' },
    ],
    steps: [
      'Warm the oil in a skillet. Add the garlic and stir until fragrant.',
      'Add the beans and a splash of water. Simmer for 5 minutes and mash a few beans to thicken the sauce.',
      'Fold in the spinach and lemon juice. Season to taste and serve with toast.',
    ],
  },
  {
    id: 'noodles', title: 'Sesame soba noodles', minutes: 25,
    ingredients: [
      { amount: 180, unit: 'g', name: 'soba noodles' },
      { amount: 1, unit: '', name: 'cucumber, thinly sliced' },
      { amount: 2, unit: 'tbsp', name: 'soy sauce' },
      { amount: 1, unit: 'tbsp', name: 'rice vinegar' },
      { amount: 1, unit: 'tbsp', name: 'toasted sesame oil' },
    ],
    steps: [
      'Cook the soba according to the packet. Rinse under cold water and drain well.',
      'Whisk the soy sauce, vinegar and sesame oil in a large bowl.',
      'Toss the noodles and cucumber with the dressing just before serving.',
    ],
  },
  {
    id: 'oats', title: 'Apple and cinnamon oats', minutes: 15,
    ingredients: [
      { amount: 90, unit: 'g', name: 'rolled oats' },
      { amount: 350, unit: 'ml', name: 'milk' },
      { amount: 1, unit: '', name: 'apple, diced' },
      { amount: 0.5, unit: 'tsp', name: 'ground cinnamon' },
      { amount: 2, unit: 'tsp', name: 'maple syrup' },
    ],
    steps: [
      'Bring the milk to a simmer and stir in the oats, apple and cinnamon.',
      'Cook over low heat, stirring occasionally, until creamy.',
      'Divide between bowls and drizzle with maple syrup.',
    ],
  },
]

const recipeFilters = [{ label: 'All', value: 'all' }, { label: 'Favorites', value: 'favorites' }]
const baseServings = 2
const servingLimit = 12
const formatAmount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export const RecipeBox = () => {
  const { value: favorites, update, hasUnsavedChanges } = usePreviewState<string[]>('recipe-box', [])
  const [selection, setSelection] = useState('beans')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [servings, setServings] = useState(baseServings)
  const search = query.trim().toLowerCase()
  const visible = recipes.filter(({ id, title, ingredients }) =>
    (filter === 'all' || favorites.includes(id)) &&
    (title.toLowerCase().includes(search) || ingredients.some(({ name }) => name.toLowerCase().includes(search))),
  )
  const recipe = visible.find(({ id }) => id === selection) ?? visible[0]

  return (
    <div className="demo-stack">
      <PreviewStatus hasUnsavedChanges={hasUnsavedChanges} />
      <div className="demo-workspace">
        <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
          <div className="demo-stack">
            <LiquidTextField aria-label="Search recipes" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search recipes" startAdornment={<SearchIcon size={16} />} type="search" value={query} />
            <LiquidSegmented className="demo-switcher" label="Recipe collection" onValueChange={setFilter} options={recipeFilters} value={filter} />
            <ul aria-label="Recipes" className="demo-list demo-picker">
              {visible.map(({ id, title, minutes }) => (
                <li key={id}>
                  <LiquidButton
                    aria-pressed={recipe?.id === id}
                    iconBefore={<ListIcon size={17} />}
                    onClick={() => {
                      setSelection(id)
                      setServings(baseServings)
                    }}
                  >
                    <span className="demo-picker__label"><strong>{title}</strong><small>{minutes} min</small></span>
                  </LiquidButton>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
        <GlassCard className="demo-pane" interactive={false} styles={paneGlass}>
          {recipe ? (
            <div className="demo-stack">
              <div className="demo-spread">
                <div>
                  <h2>{recipe.title}</h2>
                  <span className="recipe-time demo-muted"><ClockIcon size={16} />{recipe.minutes} min</span>
                </div>
                <LiquidIconButton
                  aria-pressed={favorites.includes(recipe.id)}
                  label="Favorite recipe"
                  onClick={() => update((current) => current.includes(recipe.id) ? current.filter((id) => id !== recipe.id) : [...current, recipe.id])}
                >
                  <StarIcon size={20} />
                </LiquidIconButton>
              </div>
              <div className="recipe-columns">
                <section>
                  <h3>Ingredients</h3>
                  <div aria-label="Servings" className="demo-actions recipe-servings" role="group">
                    <LiquidIconButton disabled={servings === 1} label="Fewer servings" onClick={() => setServings(servings - 1)}><MinusIcon size={16} /></LiquidIconButton>
                    <output aria-live="polite">{servings} {servings === 1 ? 'serving' : 'servings'}</output>
                    <LiquidIconButton disabled={servings === servingLimit} label="More servings" onClick={() => setServings(servings + 1)}><PlusIcon size={16} /></LiquidIconButton>
                  </div>
                  <ul className="demo-list recipe-ingredients">
                    {recipe.ingredients.map(({ amount, unit, name }) => (
                      <li key={name}><strong>{formatAmount.format(amount * servings / baseServings)} {unit}</strong> {name}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3>Method</h3>
                  <ol className="recipe-steps">{recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                </section>
              </div>
            </div>
          ) : <p className="demo-empty">{filter === 'favorites' && !search ? 'No favorite recipes yet.' : 'No matching recipes.'}</p>}
        </GlassCard>
      </div>
    </div>
  )
}
