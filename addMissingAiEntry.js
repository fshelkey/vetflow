const addMissingAiEntry = (messages, placeholder = 'AI response pending...') => {
  if (!Array.isArray(messages)) {
    throw new TypeError('Expected messages to be an array')
  }

  // Validate every message has required shape
  messages.forEach((msg, index) => {
    if (msg === null || typeof msg !== 'object') {
      throw new TypeError(`Message at index ${index} must be an object`)
    }
    if (typeof msg.role !== 'string') {
      throw new TypeError(`Message at index ${index} must have a string "role" property`)
    }
    if (typeof msg.content !== 'string') {
      throw new TypeError(`Message at index ${index} must have a string "content" property`)
    }
  })

  if (messages.length === 0) {
    return [{ role: 'assistant', content: placeholder }]
  }

  const last = messages[messages.length - 1]

  const shouldAddPlaceholder =
    last.role === 'user' ||
    (last.role === 'assistant' && !last.content)

  if (shouldAddPlaceholder) {
    return [...messages, { role: 'assistant', content: placeholder }]
  }

  return messages
}

module.exports = addMissingAiEntry