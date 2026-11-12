// Writing text to the clipboard from an event handler (a copy button, a
// row menu): the async Clipboard API, and the old textarea route for
// browsers or contexts without it (an http address, an embedded frame).
//
//   if (await copyText(order.waybill)) toast.success("Номер скопійовано");
//
// Resolves to whether the text was written; never throws.

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  } catch {
    return false;
  }
}
