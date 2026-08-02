import {
	collection,
	doc,
	getDoc,
	updateDoc,
	runTransaction,
	onSnapshot,
	query,
	orderBy,
	limit,
	serverTimestamp,
} from 'firebase/firestore'
import type { Order, OrderItem, OrderStatus } from '~/types'
import { DEFAULT_TABLE_ID, OrderStatus as Status } from '~/types'

export function useOrders() {
	const db = useDb()

	async function createOrder(
		shopId: string,
		items: OrderItem[],
	): Promise<{ orderId: string, orderNo: number }> {
		const orderRef = doc(collection(db, 'shops', shopId, 'orders'))
		const counterRef = doc(db, 'shops', shopId, 'counters', 'orders')
		const result = await runTransaction(db, async (tx) => {
			const counterSnap = await tx.get(counterRef)
			const orderNo = (counterSnap.exists() ? counterSnap.data().lastOrderNo : 0) + 1
			tx.set(orderRef, {
				tableId: DEFAULT_TABLE_ID,
				orderNo,
				status: Status.RECEIVED,
				items,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			})
			tx.set(counterRef, {
				lastOrderNo: orderNo,
				updatedAt: serverTimestamp(),
			})
			return { orderId: orderRef.id, orderNo }
		})
		return result
	}

	function subscribeOrders(
		shopId: string,
		onOrders: (orders: Order[]) => void,
	): () => void {
		const q = query(
			collection(db, 'shops', shopId, 'orders'),
			orderBy('createdAt', 'desc'),
			limit(100),
		)
		return onSnapshot(q, (snap) => {
			const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Order)
			onOrders(orders)
		})
	}

	async function updateOrderStatus(
		shopId: string,
		orderId: string,
		status: OrderStatus,
	) {
		await updateDoc(doc(db, 'shops', shopId, 'orders', orderId), {
			status,
			updatedAt: serverTimestamp(),
		})
	}

	async function getOrder(
		shopId: string,
		orderId: string,
	): Promise<Order | null> {
		const snap = await getDoc(doc(db, 'shops', shopId, 'orders', orderId))
		if (!snap.exists()) return null
		return { id: snap.id, ...snap.data() } as Order
	}

	return { createOrder, subscribeOrders, updateOrderStatus, getOrder }
}
