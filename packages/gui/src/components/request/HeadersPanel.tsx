import { FormDataEditor } from "./FormDataEditor";
import { KeyValueItem } from "./types";

interface HeadersPanelProps {
    headers: KeyValueItem[];
    onChange: (headers: KeyValueItem[]) => void;
    title?: string;
}

export function HeadersPanel({ headers, onChange }: HeadersPanelProps) {
    return (
        <div className="h-full overflow-hidden flex flex-col">
            {/* Title if needed, though FormDataEditor handles its own header row. 
                Maybe we keep the title above? Or let FormDataEditor be full height.
                User screenshot showed just the table. Let's hide title or make it small.
            */}
            {/* <h3 className="text-xs font-semibold px-4 py-2 bg-muted/10">{title}</h3> */}
            <FormDataEditor
                items={headers}
                onChange={onChange}
            />
        </div>
    );
}
