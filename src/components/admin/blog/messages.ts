import { BLOG_ERROR_MESSAGES } from "./types";

// The wording of refusals the blog screens show (errorMessage(result, own)):
// the API's own codes plus sentences that say more than the shared ones.
export const POST_ERRORS: Record<string, string> = {
  ...BLOG_ERROR_MESSAGES,
  "not-found": "Статтю не знайдено: можливо, її вже видалили. Оновіть сторінку.",
  forbidden:
    "Вашій ролі це не дозволено. Публікувати, знімати з публікації, змінювати адресу й видаляти опубліковані статті може роль із дозволом на публікацію.",
  "bad-request": "Не вдалося прочитати дані статті. Оновіть сторінку і спробуйте ще раз.",
  "too-large": "Стаття завелика для одного збереження. Розділіть довгі блоки або приберіть частину тексту.",
};

// The hint shown instead of the publishing controls to a role without
// content.publish.
export const NO_PUBLISH_HINT =
  "Публікувати й знімати статті з публікації може роль із дозволом на публікацію. Збережіть чернетку і попросіть колегу з таким дозволом її опублікувати.";

// The same for an article that is on the site or scheduled.
export const NO_UNPUBLISH_HINT =
  "Знімати з публікації й переносити час може роль із дозволом на публікацію. Зміни тексту зберігайте як звичайно: на сайті вони з'являються одразу.";

export const ORDER_DISABLED_HINT = "Порядок статей можна змінити лише в повному списку: без пошуку, фільтрів і з порядком як на сайті.";
