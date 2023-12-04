import { createState, render, useEffect, useRef } from 'kaiku'
import { Term, parseTerms } from './transfer-function'
import * as styles from './styles.css'
import { c } from './complex'

const state = createState({
  terms: [] as Term[],
  error: null as null | string,
  vars: {} as Record<string, number>,
})

const RangeInput = () => {}

const width = 800
const height = 400

const Graph = () => {
  const ref = useRef<HTMLCanvasElement>()

  useEffect(() => {
    if (!ref.current) return

    const values = []

    const numeratorTerms = state.terms.filter(
      (term): term is { type: 'x'; factor: number; offset: number } =>
        term.type === 'x'
    )

    const denominatorTerms = state.terms.filter(
      (term): term is { type: 'y'; factor: number; offset: number } =>
        term.type === 'y'
    )

    for (let i = 0; i < width; i++) {
      const x = (i / width) * Math.PI
      const z = c(Math.cos(x), Math.sin(x))

      let numerator = c(0, 0)
      let denominator = c(0, 0)

      for (const term of numeratorTerms) {
        numerator = c.add(
          numerator,
          c.mul(c(term.factor, 0), c.pow(z, c(term.offset, 0)))
        )
      }
      for (const term of denominatorTerms) {
        denominator = c.add(
          denominator,
          c.mul(c(term.factor, 0), c.pow(z, c(term.offset, 0)))
        )
      }

      values.push(c.div(numerator, denominator))
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
      const magnitude = c.polar(z).r
      context[i == 0 ? 'moveTo' : 'lineTo'](
        i,
        height - magnitude * (height - 100) - 50
      )
    }
    context.strokeStyle = '#88f'
    context.stroke()
    context.beginPath()

    for (let i = 0; i < width; i++) {
      const z = values[i]!
      const theta = c.polar(z).theta
      context[i == 0 ? 'moveTo' : 'lineTo'](
        i,
        height - (theta / Math.PI / 2 + 0.5) * (height - 100) - 50
      )
    }
    context.strokeStyle = '#8f8'
    context.stroke()
  })

  return <canvas width={width} height={height} ref={ref}></canvas>
}

const updateTerms = (input: string) => {
  state.error = null
  try {
    state.terms = parseTerms(input, {})
  } catch (err) {
    state.error = err.message
  }
}

const initialInput = '(x[n] + x[n - 2]) / 4 + (x[n - 1] - y[n - 1]) / 2'

updateTerms(initialInput)

const Terms = ({ terms }: { terms: Exclude<Term, { type: 'const' }>[] }) => {
  const sortedTerms = [...terms].sort((a, b) => b.offset - a.offset)

  return (
    <>
      {sortedTerms.map((term, i) => (
        <span>
          {i === 0
            ? term.factor < 0
              ? '-'
              : ''
            : term.factor < 0
              ? ' - '
              : ' + '}
          {Math.abs(term.factor) === 1
            ? term.offset === 0
              ? '1'
              : ''
            : Math.abs(term.factor)}
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
      (term): term is { type: 'y'; factor: number; offset: number } =>
        term.type === 'y'
    ),
  ]

  const numeratorTerms = state.terms.filter(
    (term): term is { type: 'x'; factor: number; offset: number } =>
      term.type === 'x'
  )

  return (
    <div class={styles.main}>
      <div class={styles.filter}>
        <div class={styles.lhs}>y[n] = </div>
        <input
          value={initialInput}
          onInput={(evt: InputEvent) =>
            updateTerms((evt.target as HTMLInputElement).value)
          }
        />
      </div>
      <div class={styles.error}>{state.error}</div>

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
  )
}

render(<App />, document.body)
