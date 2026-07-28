import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: '藏历星图',
    description: '探索宇宙的奥秘，感受星辰的魅力',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-CN">
            <body className="antialiased">
                {children}
            </body>
        </html>
    )
}
