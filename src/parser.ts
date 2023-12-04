import createParser from './create-parser'

export type ASTNode =
  | {
      type: 'negate'
      rhs: ASTNode
    }
  | {
      type: 'real'
      value: number
    }
  | {
      type: 'call'
      name: string
      args: ASTNode[]
    }
  | {
      type: 'assign'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'ident'
      name: string
    }
  | {
      type: 'mul'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'div'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'pow'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'sub'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'add'
      lhs: ASTNode
      rhs: ASTNode
    }
  | {
      type: 'index'
      object: ASTNode
      index: ASTNode
    }

const IDENTIFIER = /^[a-z]+/i
const NUMBER = /^\d+(\.(\d+)?)?/

const parse = createParser<ASTNode>(
  ({ accept, require, peek, token, error }) => {
    const parseAtom = (): ASTNode => {
      if (accept('(')) {
        const ex = parseExpr()
        require(')')
        return ex
      } else if (accept('-')) {
        return { type: 'negate', rhs: parseAtom() }
      } else if (accept(NUMBER)) {
        let value = parseFloat(token())
        return { type: 'real', value }
      } else if (accept(IDENTIFIER)) {
        let name = token()
        if (accept('(')) {
          const ex: ASTNode = { type: 'call', name, args: [parseExpr()] }
          for (;;) {
            if (accept(',')) {
              ex.args.push(parseExpr())
            } else {
              break
            }
          }
          require(')')
          return ex
        } else {
          return { type: 'ident', name }
        }
      }

      return error('expected expression')
    }

    const parseIndex = (): ASTNode => {
      let lhs: ASTNode = parseAtom()
      for (;;) {
        if (accept('[')) {
          lhs = { type: 'index', object: lhs, index: parseExpr() }
          require(']')
        } else {
          break
        }
      }
      return lhs
    }

    const parsePow = (): ASTNode => {
      let lhs = parseIndex()
      for (;;) {
        if (accept('^')) {
          lhs = { type: 'pow', lhs, rhs: parsePow() }
        } else {
          break
        }
      }
      return lhs
    }

    const parseImplicitMul = (): ASTNode => {
      let lhs: ASTNode = parsePow()
      while (peek(IDENTIFIER) || peek(NUMBER) || peek('(')) {
        lhs = { type: 'mul', lhs, rhs: parsePow() }
      }
      return lhs
    }

    const parseMul = (): ASTNode => {
      let lhs = parseImplicitMul()
      for (;;) {
        if (accept('*')) {
          lhs = { type: 'mul', lhs, rhs: parseImplicitMul() }
        } else if (accept('/')) {
          lhs = { type: 'div', lhs, rhs: parseImplicitMul() }
        } else {
          break
        }
      }
      return lhs
    }

    const parseSum = (): ASTNode => {
      let lhs = parseMul()
      for (;;) {
        if (accept('+')) {
          lhs = { type: 'add', lhs, rhs: parseMul() }
        } else if (accept('-')) {
          lhs = { type: 'sub', lhs, rhs: parseMul() }
        } else {
          break
        }
      }
      return lhs
    }

    const parseAssign = (): ASTNode => {
      let lhs = parseSum()
      for (;;) {
        if (accept('=')) {
          lhs = { type: 'assign', lhs, rhs: parseSum() }
        } else {
          break
        }
      }
      return lhs
    }

    const parseExpr = parseAssign

    const parse = () => {
      const expr = parseExpr()
      return expr
    }

    return parse()
  }
)

export default parse
