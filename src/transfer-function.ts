import parse, { ASTNode } from './parser'

const evaluateReal = (node: ASTNode, vars: Record<string, number>): number => {
  switch (node.type) {
    case 'real':
      return node.value
    case 'add':
      return evaluateReal(node.lhs, vars) + evaluateReal(node.rhs, vars)
    case 'sub':
      return evaluateReal(node.lhs, vars) - evaluateReal(node.rhs, vars)
    case 'mul':
      return evaluateReal(node.lhs, vars) * evaluateReal(node.rhs, vars)
    case 'div':
      return evaluateReal(node.lhs, vars) / evaluateReal(node.rhs, vars)
    case 'negate':
      return -evaluateReal(node.rhs, vars)
    case 'pow':
      return Math.pow(
        evaluateReal(node.lhs, vars),
        evaluateReal(node.rhs, vars)
      )

    case 'ident': {
      const val = vars[node.name]
      if (typeof val === 'undefined') {
        throw new Error(`cannot access undefined variable '${node.name}'`)
      }
      return val
    }

    case 'call': {
      switch (node.name) {
        case 'sin':
          if (node.args.length !== 1)
            throw new Error(
              `'sin' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.sin(evaluateReal(node.args[0]!, vars))
        case 'cos':
          if (node.args.length !== 1)
            throw new Error(
              `'cos' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.cos(evaluateReal(node.args[0]!, vars))
        case 'tan':
          if (node.args.length !== 1)
            throw new Error(
              `'tan' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.tan(evaluateReal(node.args[0]!, vars))

        default:
          throw new Error(`cannot call undefined function '${node.name}'`)
      }
    }

    default:
      throw new Error('cannot evaluate expression to real number')
  }
}

const indexNodeToSampleAccess = (
  node: ASTNode,
  vars: Record<string, number>
): { name: string; offset: number } => {
  if (node.type !== 'index') throw new Error('given node is not an index node')

  if (node.object.type !== 'ident')
    throw new Error('tried to access non-variable')
  const obj = node.object
  const index = node.index
  const name = obj.name

  if (index.type === 'ident') {
    if (index.name !== 'n')
      throw new Error('sample can only be accessed with an integer offset of n')
    return { name, offset: 0 }
  }

  if (index.type === 'add') {
    if (index.lhs.type === 'ident' && index.lhs.name === 'n') {
      const offset = evaluateReal(index.rhs, vars)
      return { name, offset }
    }
    if (index.rhs.type === 'ident' && index.rhs.name === 'n') {
      const offset = evaluateReal(index.lhs, vars)
      return { name, offset }
    }
    throw new Error('sample can only be accessed with an integer offset of n')
  }

  if (index.type === 'sub') {
    if (index.lhs.type === 'ident' && index.lhs.name === 'n') {
      const offset = -evaluateReal(index.rhs, vars)
      return { name, offset }
    }
    throw new Error('sample can only be accessed with an integer offset of n')
  }

  throw new Error('sample can only be accessed with an integer offset of n')
}

export type Term =
  | { type: 'x'; factor: number; offset: number }
  | { type: 'y'; factor: number; offset: number }

const getTerms = (node: ASTNode, vars: Record<string, number>): Term[] => {
  if (node.type === 'index') {
    const sampleAccess = indexNodeToSampleAccess(node, vars)
    if (!(sampleAccess.name === 'y' || sampleAccess.name === 'x'))
      throw new Error('only indexing of x or y is allowed')
    if (sampleAccess.name === 'y' && sampleAccess.offset === 0)
      throw new Error('cannot recursively access y')
    if (!Number.isInteger(sampleAccess.offset))
      throw new Error('sample can only be accessed with an integer offset of n')

    return [{ factor: 1, type: sampleAccess.name, offset: sampleAccess.offset }]
  }

  if (node.type === 'add') {
    return [...getTerms(node.lhs, vars), ...getTerms(node.rhs, vars)]
  }

  if (node.type === 'sub') {
    return [
      ...getTerms(node.lhs, vars),
      ...getTerms(node.rhs, vars).map((term) => ({
        ...term,
        factor: -term.factor,
      })),
    ]
  }

  if (node.type === 'mul') {
    try {
      const factor = evaluateReal(node.lhs, vars)
      return getTerms(node.rhs, vars).map((term) => ({
        ...term,
        factor: term.factor * factor,
      }))
    } catch (err) {}

    try {
      const factor = evaluateReal(node.rhs, vars)
      return getTerms(node.lhs, vars).map((term) => ({
        ...term,
        factor: term.factor * factor,
      }))
    } catch (err) {}

    throw new Error('could not evaluate term factors')
  }

  if (node.type === 'div') {
    try {
      const factor = evaluateReal(node.rhs, vars)
      return getTerms(node.lhs, vars).map((term) => ({
        ...term,
        factor: term.factor / factor,
      }))
    } catch (err) {}

    throw new Error('could not evaluate term factors')
  }

  if (node.type === 'negate') {
    return getTerms(node.rhs, vars).map((term) => ({
      ...term,
      factor: -term.factor,
    }))
  }

  if (node.type === 'real') {
    // Constants can be ignored
    return []
  }

  return []
}

const combineTerms = (terms: Term[]): Term[] => {
  const reducedTerms: Term[] = []

  for (const term of terms) {
    const reducedTerm = reducedTerms.find(
      (t) => t.type === term.type && t.offset === term.offset
    )
    if (!reducedTerm) {
      reducedTerms.push({
        ...term,
      })
    } else {
      reducedTerm.factor += term.factor
    }
  }
  return reducedTerms
}

const gcd = (a: number, b: number): number => {
  if (!b) {
    return a
  }

  return gcd(b, a % b)
}

const lcm = (a: number, b: number) => {
  return (a * b) / gcd(a, b)
}

const simplifyTerms = (terms: Term[]) => {
  const offsets = terms.map((term) => term.offset)
  const minOffset = Math.min(...offsets)
  const maxOffset = Math.max(...offsets)

  const offset = Math.ceil((maxOffset - minOffset) / 2)

  const inverseFactors = terms
    .map((term) => 1 / Math.abs(term.factor))
    .filter((factor) => factor > 1)
  const factors = terms
    .map((term) => Math.abs(term.factor))
    .filter((factor) => factor > 1)
  const factor =
    inverseFactors.length < 2 ? 1 : [...inverseFactors, ...factors].reduce(lcm)

  return terms.map((term) => ({
    ...term,
    factor: term.factor * factor,
    offset: term.offset + offset,
  }))
}

export const parseTerms = (input: string, vars: Record<string, number>) => {
  const ast = parse(input)
  return combineTerms(simplifyTerms(getTerms(ast, vars)))
}
