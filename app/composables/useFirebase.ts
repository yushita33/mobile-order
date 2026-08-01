import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export function useDb() {
	const app = useFirebaseApp()
	return getFirestore(app)
}

export function useFirebaseStorage() {
	const app = useFirebaseApp()
	return getStorage(app)
}
