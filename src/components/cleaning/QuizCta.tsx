import { QuizForm } from "../home/QuizForm";

// Figma 1327:4930 (Group 49) + 1327:4908 (Group 50) — same 246x294
// left/right decoration stacks as the home page, just with cleaning-
// specific silhouettes (hands + bottle + mask). Layout + lg+ visibility
// handled by QuizForm's `decorations` prop so the pattern matches
// /, /hotels, /protect.
export function CleaningQuizCta() {
  return (
    <QuizForm
      // Cleaning page uses the SHARED default 4-step flow (Figma master
      // 1327:4955 shows "1/4 Оберіть напрям" with the home page's 3
      // direction options). The previous cleaning-specific steps drifted
      // from Figma — same content as the home quiz reads as one
      // consistent funnel across the whole site.
      // Bold-then-light pattern matching Figma 1327:4952. Body is
      // TWO separate paragraphs per Figma 1327:4953.
      decorations="cleaning"
      headingTitle={
        <>
          <span className="text-h2">Отримайте підбір рішень </span>
          <span className="text-h2-light">{`для вашого об'єкта`}</span>
        </>
      }
      headingBody={
        <>
          <p>
            {`Заповніть коротку форму — і ми підготуємо для вас
            індивідуальний підбір позицій та комерційну пропозицію.`}
          </p>
          <p>
            {`Без зайвих дзвінків і уточнень — тільки те, що вам реально
            потрібно.`}
          </p>
        </>
      }
    />
  );
}
