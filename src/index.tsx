import { createState, render, useEffect, useRef } from 'kaiku'
import { Term, parseTerms } from './transfer-function'
import * as styles from './styles.css'
import { c } from './complex'
import { ASTNode } from './parser'

type Var = {
  varName: string
  value: number
}

const serializeState = ({
  filterInput,
  vars,
}: {
  filterInput: string
  vars: Var[]
}): string => {
  return btoa(JSON.stringify([filterInput, vars]))
}

const deserializeState = (
  input: string
): null | { filterInput: string; vars: Var[] } => {
  try {
    const [filterInput, vars] = JSON.parse(atob(input))
    return { filterInput, vars }
  } catch (err) {
    return null
  }
}

const initialState = deserializeState(location.hash.substring(1))
const defaultFilterInput =
  'y[n] = (x[n] + x[n - 2]) / 4 + (x[n - 1] - y[n - 1]) / 2'

const state = createState({
  terms: [] as Term[],
  error: null as null | string,
  filterInput: initialState?.filterInput ?? defaultFilterInput,
  vars: initialState?.vars ?? ([] as Var[]),
})

const RangeInput = ({ v }: { v: Var }) => {
  return (
    <div class={styles.var}>
      <div>
        <input
          class={styles.name}
          value={v.varName}
          onInput={(evt: any) => {
            v.varName = evt.target.value
          }}
          type="text"
          pattern="[a-z_]+"
        />
        = {v.value}
      </div>
      <button onClick={() => { state.vars = state.vars.filter(vv => vv !== v)}}>- delete</button>
      <input
        type="range"
        min={-1}
        max={1}
        value={v.value}
        onInput={(evt: InputEvent) => {
          v.value = parseFloat((evt.target as HTMLTextAreaElement).value)
        }}
        step="0.01"
      />
    </div>
  )
}

const width = 600
const height = 400

const Graph = () => {
  const ref = useRef<HTMLCanvasElement>()

  useEffect(() => {
    if (!ref.current) return

    const values: { theta: number; r: number }[] = []

    const numeratorTerms = state.terms.filter(
      (term): term is { type: 'x'; coeff: number; offset: number } =>
        term.type === 'x'
    )

    const denominatorTerms = state.terms.filter(
      (term): term is { type: 'y'; coeff: number; offset: number } =>
        term.type === 'y'
    )

    for (let i = 0; i < width; i++) {
      const x = ((i / width) ** 2) * Math.PI
      const z = c(Math.cos(x), Math.sin(x))

      let numerator = c(0, 0)
      let denominator = c(0, 0)

      for (const term of numeratorTerms) {
        numerator = c.add(
          numerator,
          c.mul(c(term.coeff, 0), c.pow(z, c(term.offset, 0)))
        )
      }
      for (const term of denominatorTerms) {
        denominator = c.add(
          denominator,
          c.mul(c(term.coeff, 0), c.pow(z, c(term.offset, 0)))
        )
      }

      values.push(c.polar(c.div(numerator, denominator)))
    }

    const context = ref.current.getContext('2d')!
    context.clearRect(0, 0, width, height)
    context.strokeStyle = '#fff'

    context.fillStyle = '#faa'
    context.fillRect(0, 50, width, 1)
    context.fillRect(0, 350, width, 1)
    context.lineWidth = 2
    context.beginPath()

    for (let i = 0; i < width; i++) {
      const z = values[i]!
      context[i == 0 ? 'moveTo' : 'lineTo'](
        i,
        height - z.r * (height - 100) - 50
      )
    }
    context.strokeStyle = '#88f'
    context.stroke()
    context.beginPath()

    for (let i = 0; i < width; i++) {
      const z = values[i]!
      context[i == 0 ? 'moveTo' : 'lineTo'](
        i,
        height - (z.theta / Math.PI / 2 + 0.5) * (height - 100) - 50
      )
    }
    context.strokeStyle = '#8f8'
    context.stroke()
  })

  return <canvas width={width} height={height} ref={ref}></canvas>
}

const updateTerms = () => {
  state.error = null
  try {
    const vars: Record<string, ASTNode> = {}
    for (const v of state.vars) {
      vars[v.varName] = { type: 'real', value: v.value }
    }

    vars['pi'] = { type: 'real', value: Math.PI }
    vars['e'] = { type: 'real', value: Math.E }

    location.hash = serializeState(state)
    state.terms = parseTerms(state.filterInput, vars)
  } catch (err) {
    state.error = err.message
  }
}

useEffect(updateTerms)

const formatNumber = (x: number): string => {
  let v = x.toString()
  let d = v.split('.')[1]?.length ?? 0
  if (d > 3) return x.toFixed(3)
  return v
}

const Terms = ({ terms }: { terms: Exclude<Term, { type: 'const' }>[] }) => {
  const sortedTerms = [...terms].sort((a, b) => b.offset - a.offset)

  return (
    <>
      {sortedTerms.map((term, i) => (
        <span>
          {i === 0
            ? term.coeff < 0
              ? '−'
              : ''
            : term.coeff < 0
              ? ' − '
              : ' + '}
          {Math.abs(term.coeff) === 1
            ? term.offset === 0
              ? '1'
              : ''
            : formatNumber(Math.abs(term.coeff))}
          {term.offset === 0 ? (
            ''
          ) : (
            <>
              <i>z</i>
              {term.offset === 1 ? '' : <sup>{term.offset}</sup>}
            </>
          )}
        </span>
      ))}
    </>
  )
}

const App = () => {
  const denominatorTerms: Exclude<Term, { type: 'const' }>[] = [
    ...state.terms.filter(
      (term): term is { type: 'y'; coeff: number; offset: number } =>
        term.type === 'y'
    ),
  ]

  const numeratorTerms = state.terms.filter(
    (term): term is { type: 'x'; coeff: number; offset: number } =>
      term.type === 'x'
  )

  return (
    <div class={styles.main}>
      <div class={styles.editor}>
        <div class={styles.vars}>
          <button
            onClick={() => {
              state.vars.push({
                varName: 'a',
                value: 0.0,
              })
            }}
          >
            + var
          </button>
          {state.vars.map((v) => (
            <RangeInput v={v} />
          ))}
        </div>
        <div class={styles.filter}>
          <textarea
            onInput={(evt: InputEvent) => {
              state.filterInput = (evt.target as HTMLInputElement).value
            }}
          >
            {state.filterInput}
          </textarea>
        </div>
        <div class={styles.error}>{state.error}</div>
      </div>
      <div class={styles.result}>
        <div class={styles.transferFunction}>
          <div class={styles.lhs}>
            <i>H</i>(z) ={' '}
          </div>
          <div class={styles.rhs}>
            <div class={styles.numerator}>
              {numeratorTerms.length === 0 ? (
                '1'
              ) : (
                <Terms terms={numeratorTerms} />
              )}
            </div>
            <div class={styles.denominator}>
              <Terms terms={denominatorTerms} />
            </div>
          </div>
        </div>

        <Graph />
      </div>
    </div>
  )
}

render(<App />, document.body)
