import { QuizForm } from "../home/QuizForm";

// Figma 1327:4131 visible quiz card state is the home-page DEFAULT_STEPS[0]
// ("Оберіть напрям", counter 1/4). The shared <QuizForm /> defaults give
// the correct 4-step flow without a custom override — only the heading
// title differs ("Отримайте підбір рішень для вашого об'єкта") and the
// decorative flanking silhouettes are enabled via the `decorations` prop.
export function ProtectQuizCta() {
  return (
    <QuizForm
      headingTitle={
        <>
          <span className="text-h2">Отримайте підбір рішень </span>
          <span className="text-h2-light">{`для вашого об'єкта`}</span>
        </>
      }
      decorations="protect"
    />
  );
}
