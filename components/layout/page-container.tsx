import { cn } from "@/lib/utils"

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    centered?: boolean
}

export function Page({ children, className, centered = false }: PageProps) {
    return (
        <main
            className={cn(
                "flex-1 w-full max-w-md mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
                centered && "flex flex-col justify-center",
                className
            )}
        >
            {children}
        </main>
    )
}
