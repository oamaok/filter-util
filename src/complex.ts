export type Complex = { r: number; i: number }

export const c = (r: number, i: number): Complex => ({ r, i })

c.polar = (z: Complex) => {
  const r = Math.sqrt(z.r ** 2 + z.i ** 2)
  const theta = Math.atan2(z.r, z.i)
  return { r, theta }
}

c.mul = (a: Complex, b: Complex) =>
  c(a.r * b.r - a.i * b.i, a.r * b.i + a.i * b.r)

c.div = (a: Complex, b: Complex) => {
  let l = b.r ** 2 + b.i ** 2
  return c((a.r * b.r + a.i * b.i) / l, (a.i * b.r - a.r * b.i) / l)
}

c.add = (a: Complex, b: Complex) => c(a.r + b.r, a.i + b.i)

c.sub = (a: Complex, b: Complex) => c(a.r - b.r, a.i - b.i)

c.exp = (z: Complex) => {
  let exp = Math.exp(z.r)
  return c(exp * Math.cos(z.i), exp * Math.sin(z.i))
}

c.ln = (z: Complex) => {
  const { r, theta } = c.polar(z)
  return c(Math.log(r), theta)
}

c.pow = (a: Complex, b: Complex) => {
  /*
  const k = 0
  const { r, theta } = polar(a)
  const m = Math.pow(r, b.r) * Math.exp(-b.i * (theta + 2 * k * Math.PI))
  return c(
    m * Math.cos(b.i * Math.log(r) + b.r * theta + 2 * b.r * k * Math.PI),
    m * Math.sin(b.i * Math.log(r) + b.r * theta + 2 * b.r * k * Math.PI)
  )
  */

  // Only real integers exponents supported
  if (b.i !== 0) throw new Error('Only real integers exponents supported')
  if (b.r === 0) return c(1, 0)
  if (b.r === 1) return a
  if (b.r < 0) {
    let ret = c(1, 0)
    for (let i = 0; i < -b.r; i++) {
      ret = c.div(ret, a)
    }
    return ret
  }

  let ret = c(a.r, a.i)
  for (let i = 1; i < b.r; i++) {
    ret = c.mul(ret, a)
  }
  return ret
}

c.neg = (z: Complex) => c(-z.r, z.i)

c.sin = (z: Complex) =>
  c(Math.sin(z.r) * Math.cosh(z.i), Math.cos(z.r) * Math.sinh(z.i))

c.cos = (z: Complex) =>
  c(Math.cos(z.r) * Math.cosh(z.i), -Math.sin(z.r) * Math.sinh(z.i))

c.tan = (z: Complex) =>
  c.div(
    c(Math.sin(z.r * 2), Math.sinh(z.i * 2)),
    c(Math.cos(z.r * 2) + Math.cosh(z.i * 2), 0)
  )
