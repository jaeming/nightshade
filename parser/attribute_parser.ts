export const attributeParser = (attrs) => {
  attrs = attrs && attrs.length && attrs[1] ? attrs[1].split(' ') : []
  return attrs.reduce((memo, i) => {
    const [key, val] = i.split('=')
    console.log(val)
    memo[key] = val
    return memo
  }, {})
}
