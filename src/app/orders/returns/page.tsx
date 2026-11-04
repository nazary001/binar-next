import { redirect } from "next/navigation";

// The returns list is the «Повернення» tab of /orders (5192:78615).
export default function ReturnsIndexPage() {
  redirect("/orders?tab=returns");
}
