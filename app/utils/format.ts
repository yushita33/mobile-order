import type { Timestamp } from 'firebase/firestore'

export function formatPrice(yen: number): string {
	return `¥${yen.toLocaleString('ja-JP')}`
}

export function formatDateTime(ts: Timestamp | null | undefined): string {
	if (!ts) return ''
	return ts.toDate().toLocaleString('ja-JP', {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})
}
