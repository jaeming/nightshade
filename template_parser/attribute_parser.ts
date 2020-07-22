export const attributeParser = (attrs) => {
  attrs = attrs && attrs.length && attrs[1] ? attrs[1].split(' ') : []
  return attrs.reduce((memo, i) => {
    let [key, val] = i.split('=')
    const value = parseValue(val) 
    memo[key] = value
    return memo
  }, {})
}

function parseValue(val) {
  const stripQuotes = (val || '').match(/"(.*)"/)
  return (stripQuotes && stripQuotes[1]) || val
}
