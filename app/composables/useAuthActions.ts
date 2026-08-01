import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

export function useAuthActions() {
	const auth = useFirebaseAuth()

	async function signInWithGoogle(): Promise<void> {
		if (!auth) throw new Error('Authentication is not available')
		const provider = new GoogleAuthProvider()
		await signInWithPopup(auth, provider)
	}

	async function signOutUser(): Promise<void> {
		if (!auth) return
		await signOut(auth)
	}

	return { signInWithGoogle, signOut: signOutUser }
}
