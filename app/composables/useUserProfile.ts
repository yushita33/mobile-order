import type { User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export function useUserProfile() {
	const db = useDb()

	async function ensureUserProfile(user: User) {
		const userRef = doc(db, 'users', user.uid)
		const snap = await getDoc(userRef)
		if (!snap.exists()) {
			await setDoc(userRef, {
				name: user.displayName ?? '',
				email: user.email ?? '',
				role: 'owner',
				createdAt: serverTimestamp(),
			})
		}
	}

	return { ensureUserProfile }
}
