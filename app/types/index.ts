import type { Timestamp } from 'firebase/firestore'

export const OrderStatus = {
	RECEIVED: 'received',
	COOKING: 'cooking',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
	[OrderStatus.RECEIVED]: '受付済み',
	[OrderStatus.COOKING]: '調理中',
	[OrderStatus.COMPLETED]: '提供済み',
	[OrderStatus.CANCELLED]: 'キャンセル',
}

export const DEFAULT_TABLE_ID = 't1'

export interface UserProfile {
	name: string
	email: string
	role: 'owner'
	createdAt: Timestamp
}

export interface Shop {
	id: string
	ownerUid: string
	publicId: string
	name: string
	description?: string
	logoUrl?: string
	lastOrderNo: number
	createdAt: Timestamp
	updatedAt: Timestamp
}

export interface ShopSettings {
	isOpen: boolean
	taxRate: number
	currency: string
	receiptMessage?: string
}

export interface MenuGroup {
	id: string
	name: string
	sortOrder: number
}

export interface Menu {
	id: string
	menuGroupId?: string
	name: string
	description?: string
	price: number
	imageUrl?: string
	storagePath?: string
	imageUpdatedAt?: number
	isVisible: boolean
	soldOut: boolean
	sortOrder: number
	version: number
}

export interface OrderItem {
	menuId: string
	name: string
	price: number
	qty: number
	menuVersion: number
}

export interface Order {
	id: string
	tableId: string
	orderNo: number
	status: OrderStatus
	items: OrderItem[]
	createdAt: Timestamp
	updatedAt?: Timestamp
}

export type CartItem = OrderItem

export const MAX_ORDER_ITEMS = 20
export const MAX_ITEM_QTY = 99
