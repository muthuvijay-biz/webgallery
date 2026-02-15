import { cn } from '@/lib/utils'

function Shimmer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      className={cn('shimmer rounded-md bg-muted/40 overflow-hidden', className)}
      {...props}
    />
  )
}

export { Shimmer }
export default Shimmer
