import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:bg-[hsl(40,30%,90%)] data-[state=checked]:bg-[hsl(220,100%,33%)]",
      className,
    )}
    style={{
      border: "1.5px solid hsl(0, 0%, 30%)",
      borderRadius: "9999px",
      filter: "url(#wobbly)",
    }}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[20px] w-[20px] rounded-full shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px] data-[state=checked]:animate-[thumb-bounce_0.3s_ease-out]",
      )}
      style={{
        background: "hsl(40, 30%, 96%)",
        border: "1px solid hsl(0, 0%, 40%)",
        filter: "url(#wobbly)",
      }}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
