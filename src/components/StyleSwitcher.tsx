type UiCase = "case1" | "case2";

export function StyleSwitcher({
  activeCase,
  onChange
}: {
  activeCase: UiCase;
  onChange: (value: UiCase) => void;
}) {
  return (
    <nav className="case-switcher" aria-label="UI 风格切换">
      <button
        type="button"
        className={activeCase === "case1" ? "is-active" : ""}
        onClick={() => onChange("case1")}
      >
        <span>Case 1</span>
        <strong>陪伴卡</strong>
      </button>
      <button
        type="button"
        className={activeCase === "case2" ? "is-active" : ""}
        onClick={() => onChange("case2")}
      >
        <span>Case 2</span>
        <strong>控制台面</strong>
      </button>
    </nav>
  );
}
