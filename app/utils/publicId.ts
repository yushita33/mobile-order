const ALPHABET
	= '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function generatePublicId(length = 10): string {
	const randomValues = new Uint32Array(length)
	crypto.getRandomValues(randomValues)
	let result = ''
	for (let i = 0; i < length; i++) {
		result += ALPHABET.charAt(randomValues[i]! % ALPHABET.length)
	}
	return result
}
