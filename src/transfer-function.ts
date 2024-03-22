import parse, { ASTNode } from './parser'

type FnDef = { args: string[]; def: ASTNode }

const canBeEvaluated = (node: ASTNode): boolean => {
  switch (node.type) {
    case 'real':
      return true
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'pow':
      return canBeEvaluated(node.lhs) && canBeEvaluated(node.rhs)
    case 'negate':
      return canBeEvaluated(node.rhs)

    case 'ident': {
      return true
    }

    case 'call': {
      return node.args.every(canBeEvaluated)
    }

    default:
      return false
  }
}

const evaluateReal = (
  node: ASTNode,
  vars: Record<string, ASTNode>,
  fns: Record<string, FnDef>
): number => {
  switch (node.type) {
    case 'real':
      return node.value
    case 'add':
      return (
        evaluateReal(node.lhs, vars, fns) + evaluateReal(node.rhs, vars, fns)
      )
    case 'sub':
      return (
        evaluateReal(node.lhs, vars, fns) - evaluateReal(node.rhs, vars, fns)
      )
    case 'mul':
      return (
        evaluateReal(node.lhs, vars, fns) * evaluateReal(node.rhs, vars, fns)
      )
    case 'div':
      return (
        evaluateReal(node.lhs, vars, fns) / evaluateReal(node.rhs, vars, fns)
      )
    case 'negate':
      return -evaluateReal(node.rhs, vars, fns)
    case 'pow':
      return Math.pow(
        evaluateReal(node.lhs, vars, fns),
        evaluateReal(node.rhs, vars, fns)
      )

    case 'ident': {
      const val = vars[node.name]
      if (typeof val === 'undefined') {
        throw new Error(`cannot access undefined variable '${node.name}'`)
      }
      return evaluateReal(val, vars, fns)
    }

    case 'call': {
      const fn = fns[node.name]
      if (fn) {
        if (node.args.length !== fn.args.length)
          throw new Error(`Invalid amount of args when calling ${node.name}`)

        const localVars = { ...vars }
        for (let i = 0; i < node.args.length; i++) {
          localVars[fn.args[i]!] = node.args[i]!
        }

        return evaluateReal(fn.def, localVars, fns)
      }

      switch (node.name) {
        case 'sin':
          if (node.args.length !== 1)
            throw new Error(
              `'sin' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.sin(evaluateReal(node.args[0]!, vars, fns))
        case 'sqrt':
          if (node.args.length !== 1)
            throw new Error(
              `'sqrt' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.sqrt(evaluateReal(node.args[0]!, vars, fns))
        case 'cos':
          if (node.args.length !== 1)
            throw new Error(
              `'cos' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.cos(evaluateReal(node.args[0]!, vars, fns))
        case 'tan':
          if (node.args.length !== 1)
            throw new Error(
              `'tan' requires one argument, ${node.args.length} arguments provided`
            )
          return Math.tan(evaluateReal(node.args[0]!, vars, fns))

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
  vars: Record<string, ASTNode>,
  fns: Record<string, FnDef>
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
      const offset = evaluateReal(index.rhs, vars, fns)
      return { name, offset }
    }
    if (index.rhs.type === 'ident' && index.rhs.name === 'n') {
      const offset = evaluateReal(index.lhs, vars, fns)
      return { name, offset }
    }
    throw new Error('sample can only be accessed with an integer offset of n')
  }

  if (index.type === 'sub') {
    if (index.lhs.type === 'ident' && index.lhs.name === 'n') {
      const offset = -evaluateReal(index.rhs, vars, fns)
      return { name, offset }
    }
    throw new Error('sample can only be accessed with an integer offset of n')
  }

  throw new Error('sample can only be accessed with an integer offset of n')
}

/*
const getCoeff = (node: ASTNode): Coeff => {
  switch (node.type) {
    case 'real':
      return { type: 'const', value: node.value }
    case 'add': {
      const lhsCoeff = getCoeff(node.lhs)
      const rhsCoeff = getCoeff(node.rhs)

      if (lhsCoeff.type === 'const' && rhsCoeff.type === 'const') {
        return { type: 'const', value: lhsCoeff.value + rhsCoeff.value }
      }

      return evaluateReal(node.lhs, vars) + evaluateReal(node.rhs, vars)
    }
    case 'sub': {
      const lhsCoeff = getCoeff(node.lhs)
      const rhsCoeff = getCoeff(node.rhs)

      if (lhsCoeff.type === 'const' && rhsCoeff.type === 'const') {
        return { type: 'const', value: lhsCoeff.value / rhsCoeff.value }
      }

      return evaluateReal(node.lhs, vars) - evaluateReal(node.rhs, vars)
    }
    case 'mul': {
      const lhsCoeff = getCoeff(node.lhs)
      const rhsCoeff = getCoeff(node.rhs)

      if (lhsCoeff.type === 'const') {
        if (rhsCoeff.type === 'const') {
          return { type: 'const', value: lhsCoeff.value * rhsCoeff.value }
        }

        return { ...rhsCoeff, coeff: lhsCoeff }
      }

      if (rhsCoeff.type === 'const') {
        return {
          ...lhsCoeff,
          coeff: rhsCoeff,
        }
      }

      return evaluateReal(node.lhs, vars) - evaluateReal(node.rhs, vars)
    }
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

  return null
}

export type Coeff =
  | {
      type: 'const'
      value: number
    }
  | { type: 'var'; name: string }
  | {
      type: 'function'
      name: string
      args: Coeff[]
    }
  
*/

export type Term =
  | { type: 'x'; coeff: number; offset: number }
  | { type: 'y'; coeff: number; offset: number }

const getTerms = (
  node: ASTNode,
  vars: Record<string, ASTNode>,
  fns: Record<string, FnDef>
): Term[] => {
  if (node.type === 'index') {
    const sampleAccess = indexNodeToSampleAccess(node, vars, fns)
    if (!(sampleAccess.name === 'y' || sampleAccess.name === 'x'))
      throw new Error('only indexing of x or y is allowed')
    if (sampleAccess.name === 'y' && sampleAccess.offset === 0)
      throw new Error('cannot recursively access y')
    if (!Number.isInteger(sampleAccess.offset))
      throw new Error('sample can only be accessed with an integer offset of n')

    return [{ coeff: 1, type: sampleAccess.name, offset: sampleAccess.offset }]
  }

  if (node.type === 'add') {
    return [...getTerms(node.lhs, vars, fns), ...getTerms(node.rhs, vars, fns)]
  }

  if (node.type === 'sub') {
    return [
      ...getTerms(node.lhs, vars, fns),
      ...getTerms(node.rhs, vars, fns).map((term) => ({
        ...term,
        coeff: -term.coeff,
      })),
    ]
  }

  if (node.type === 'mul') {
    try {
      const coeff = evaluateReal(node.lhs, vars, fns)
      return getTerms(node.rhs, vars, fns).map((term) => ({
        ...term,
        coeff: term.coeff * coeff,
      }))
    } catch (err) {}

    const coeff = evaluateReal(node.rhs, vars, fns)
    return getTerms(node.lhs, vars, fns).map((term) => ({
      ...term,
      coeff: term.coeff * coeff,
    }))
  }

  if (node.type === 'div') {
    const coeff = evaluateReal(node.rhs, vars, fns)
    return getTerms(node.lhs, vars, fns).map((term) => ({
      ...term,
      coeff: term.coeff / coeff,
    }))
  }

  if (node.type === 'negate') {
    return getTerms(node.rhs, vars, fns).map((term) => ({
      ...term,
      coeff: -term.coeff,
    }))
  }

  if (node.type === 'real') {
    // Constants can be ignored
    return []
  }

  return []
}

const combineTerms = (terms: Term[]): Term[] => {
  return terms
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
      reducedTerm.coeff += term.coeff
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

const simplifyTerms = (terms: Term[]): Term[] => {
  return terms
  const offsets = terms.map((term) => term.offset)
  const minOffset = Math.min(...offsets)
  const maxOffset = Math.max(...offsets)

  const offset = Math.ceil((maxOffset - minOffset) / 2)

  const inverseCoeffs = terms
    .filter((term) => Math.abs(term.coeff) > 0.000001)
    .map((term) => 1 / Math.abs(term.coeff))
    .filter((coeff) => coeff > 1)
  const coeffs = terms
    .map((term) => Math.abs(term.coeff))
    .filter((coeff) => coeff > 1)
    .filter((coeff) => coeff > 0.000001)
  const coeff =
    inverseCoeffs.length < 2
      ? 1
      : [...inverseCoeffs, ...coeffs]
          .filter((c) => c !== 0 && !isNaN(c) && Math.abs(c) !== Infinity)
          .reduce(lcm)

  if (coeff > 100) return terms

  return terms.map((term) => ({
    ...term,
    coeff: term.coeff * coeff,
    offset: term.offset + offset,
  }))
}

const isIdentWithName = (node: ASTNode, name: string) => {
  return node.type === 'ident' && node.name === name
}

export const parseTerms = (input: string, vars: Record<string, ASTNode>) => {
  const ast = parse(input)

  if (ast.type !== 'root') {
    throw Error('parse result is not a root node: should not happen')
  }

  const filterDef = ast.nodes.find(
    (node): node is Extract<ASTNode, { type: 'assign' }> => {
      if (node.type !== 'assign') return false
      if (node.lhs.type !== 'index') return false

      return (
        isIdentWithName(node.lhs.object, 'y') &&
        isIdentWithName(node.lhs.index, 'n')
      )
    }
  )

  const varsWithLocals = { ...vars }
  const fns: Record<string, FnDef> = {}

  for (const node of ast.nodes) {
    if (node === filterDef) continue

    if (node.type === 'assign') {
      if (node.lhs.type === 'ident') {
        varsWithLocals[node.lhs.name] = node.rhs
      } else if (node.lhs.type === 'call') {
        const args: string[] = []

        for (const arg of node.lhs.args) {
          if (arg.type !== 'ident')
            throw new Error('Invalid function arguments in assignment')
          args.push(arg.name)
        }

        fns[node.lhs.name] = { args, def: node.rhs }
      } else {
        throw new Error(`Invalid assignment lhs: ${node.lhs.type}`)
      }
    }
  }

  if (!filterDef) {
    throw new Error(
      'Could not find filter definition. You must include definition for y[n]'
    )
  }

  const terms: Term[] = [
    { type: 'y', coeff: 1, offset: 0 },
    ...getTerms(filterDef.rhs, varsWithLocals, fns),
  ]
  return combineTerms(simplifyTerms(terms))
}
