import React from "react"
// Input component with variable resolution support
import { Input } from "./input"
import { useVariableResolver } from "../../hooks/useVariableResolver"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./tooltip"
import { cn } from "../../lib/utils"

interface InputWithVariablesProps extends React.InputHTMLAttributes<HTMLInputElement> {
    wrapperClassName?: string;
}

const InputWithVariables = React.forwardRef<HTMLInputElement, InputWithVariablesProps>(
    ({ className, wrapperClassName, value, ...props }, ref) => {
        const { resolve, hasVariables } = useVariableResolver()

        const stringValue = String(value || "")
        const hasVars = hasVariables(stringValue)
        const resolvedValue = hasVars ? resolve(stringValue) : stringValue

        // Only show tooltip if there are variables and the resolved value is different
        const shouldShowTooltip = hasVars && resolvedValue !== stringValue

        if (!shouldShowTooltip) {
            return (
                <Input
                    ref={ref}
                    value={value}
                    className={cn("font-mono", className, wrapperClassName)}
                    {...props}
                />
            )
        }

        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <div className={cn("relative w-full", wrapperClassName)}>
                            <Input
                                ref={ref}
                                value={value}
                                className={cn("font-mono text-primary", className)}
                                {...props}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="bg-popover text-popover-foreground border-border break-all max-w-[300px]">
                        <div className="text-xs space-y-1">
                            <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Resolved Value</p>
                            <div className="font-mono bg-muted/50 p-1.5 rounded text-foreground/90">
                                {resolvedValue}
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }
)
InputWithVariables.displayName = "InputWithVariables"

export { InputWithVariables }
