type ParserFns = {
  accept: (pattern: string | RegExp) => boolean
  require: (pattern: string | RegExp) => void
  peek: (pattern: string | RegExp) => boolean
  error: (message: string) => never
  token: () => string
}

const createParser =
  <AST>(parser: (fns: ParserFns) => AST) =>
  (input: string) => {
    let subInput = input.trim()
    let token: string = ''

    const error: ParserFns['error'] = (message) => {
      throw new Error(`syntax error: ${message}`)
    }

    const accept: ParserFns['accept'] = (pattern) => {
      const match =
        typeof pattern === 'string'
          ? subInput.startsWith(pattern)
            ? pattern
            : false
          : subInput.match(pattern)?.[0]
      if (match === false || match === undefined) return false
      token = match
      subInput = subInput.substring(token.length).replace(/^[ \t]+/, '')
      return true
    }

    const peek: ParserFns['peek'] = (pattern) => {
      const match =
        typeof pattern === 'string'
          ? subInput.startsWith(pattern)
            ? pattern
            : false
          : subInput.match(pattern)?.[0]
      return !!match
    }

    const require: ParserFns['require'] = (regex) => {
      if (!accept(regex)) error(`expected ${regex}`)
    }

    return parser({ accept, require, peek, error, token: () => token })
  }

export default createParser
