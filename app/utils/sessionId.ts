import { generatePublicId } from './publicId'

export function generateSessionId(length = 24): string {
	return generatePublicId(length)
}
