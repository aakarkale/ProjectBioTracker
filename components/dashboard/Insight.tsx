type Props = {
  tag: string;
  tagColor: string;
  title: string;
  body: string;
};

export function Insight({ tag, tagColor, title, body }: Props) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 font-mono text-xs"
          style={{
            background: `${tagColor}20`,
            color: tagColor,
            border: `1px solid ${tagColor}40`,
          }}
        >
          {tag}
        </span>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs leading-relaxed text-mute">{body}</p>
    </div>
  );
}
